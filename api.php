<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const DB_HOST = 'database';
const DB_PORT = 3306;
const DB_NAME = 'sticky';
const DB_USER = 'root';
const DB_PASSWORD = '';
const NOTE_SIZE = 240;
const MEMBER_ACTIVE_WINDOW_SECONDS = 300;
const DEFAULT_BOARD_COLUMNS = 20;
const DEFAULT_BOARD_ROWS = 10;
const MIN_BOARD_DIMENSION = 10;

function readJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function nowIso(): string
{
    return gmdate(DATE_ATOM);
}

function db(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        DB_HOST,
        DB_PORT,
        DB_NAME
    );

    $pdo = new PDO($dsn, DB_USER, DB_PASSWORD, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function normalizeCode(string $code): string
{
    return strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', strtoupper($code)) ?? '', 0, 6));
}

function normalizeClientId(string $clientId): string
{
    return substr(preg_replace('/[^a-zA-Z0-9_-]/', '', $clientId) ?? '', 0, 64);
}

function generateUniqueBoardCode(PDO $db): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    $alphabetLength = strlen($alphabet) - 1;

    for ($attempt = 0; $attempt < 20; $attempt++) {
        $code = '';
        for ($index = 0; $index < 6; $index++) {
            $code .= $alphabet[random_int(0, $alphabetLength)];
        }

        if (getBoardByCode($db, $code) === null) {
            return $code;
        }
    }

    throw new RuntimeException('Unable to generate a unique board code.');
}

function generateToken(): string
{
    return bin2hex(random_bytes(24));
}

function normalizePin(string $pin): string
{
    return substr(preg_replace('/\D/', '', $pin) ?? '', 0, 4);
}

function settingsFromBoardRow(array $board): array
{
    $maxBoardColumns = max(MIN_BOARD_DIMENSION, (int) ($board['max_board_columns'] ?? DEFAULT_BOARD_COLUMNS));
    $maxBoardRows = max(MIN_BOARD_DIMENSION, (int) ($board['max_board_rows'] ?? DEFAULT_BOARD_ROWS));

    return [
        'allowOnlyOwnMove' => (bool) $board['allow_only_own_move'],
        'allowOnlyOwnDelete' => (bool) $board['allow_only_own_delete'],
        'allowOnlyOwnEdit' => (bool) $board['allow_only_own_edit'],
        'allowViewerCreateNotes' => (bool) $board['allow_viewer_create_notes'],
        'maxNotesPerUser' => (int) $board['max_notes_per_user'],
        'maxBoardColumns' => $maxBoardColumns,
        'maxBoardRows' => $maxBoardRows,
        'kickBlockMinutes' => (int) $board['kick_block_minutes'],
    ];
}

function boardRowToPayload(array $board, bool $isTeacher = false): array
{
    return [
        'id' => (int) $board['id'],
        'code' => $board['code'],
        'title' => $board['title'],
        'createdAt' => $board['created_at'],
        'updatedAt' => $board['updated_at'],
        'supervisedMode' => (bool) $board['supervised_mode'],
        'isTeacher' => $isTeacher,
        'settings' => settingsFromBoardRow($board),
    ];
}

function noteRowToPayload(array $note): array
{
    return [
        'id' => (int) $note['id'],
        'boardId' => (int) $note['board_id'],
        'author' => $note['author'],
        'content' => $note['content'],
        'color' => $note['color'],
        'fontFamily' => $note['font_family'],
        'fontSize' => (int) $note['font_size'],
        'isBold' => (bool) $note['is_bold'],
        'isItalic' => (bool) $note['is_italic'],
        'isUnderline' => (bool) $note['is_underline'],
        'x' => (int) $note['pos_x'],
        'y' => (int) $note['pos_y'],
        'zIndex' => (int) $note['z_index'],
        'createdAt' => $note['created_at'],
        'updatedAt' => $note['updated_at'],
        'ownerClientId' => $note['owner_client_id'],
    ];
}

function memberRowToPayload(array $member, PDO $db): array
{
    $countQuery = $db->prepare('SELECT COUNT(*) FROM notes WHERE board_id = :board_id AND owner_client_id = :client_id');
    $countQuery->execute([
        ':board_id' => (int) $member['board_id'],
        ':client_id' => $member['client_id'],
    ]);

    return [
        'clientId' => $member['client_id'],
        'userName' => $member['user_name'],
        'isTeacher' => (bool) $member['is_teacher'],
        'joinedAt' => $member['joined_at'],
        'lastSeen' => $member['last_seen'],
        'noteCount' => (int) $countQuery->fetchColumn(),
    ];
}

function getBoardByCode(PDO $db, string $code): ?array
{
    $stmt = $db->prepare('SELECT * FROM boards WHERE code = :code LIMIT 1');
    $stmt->execute([':code' => $code]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function getNoteById(PDO $db, int $noteId): ?array
{
    $stmt = $db->prepare('SELECT * FROM notes WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $noteId]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function getNotesForBoard(PDO $db, int $boardId): array
{
    $stmt = $db->prepare('SELECT * FROM notes WHERE board_id = :board_id ORDER BY z_index ASC, id ASC');
    $stmt->execute([':board_id' => $boardId]);

    return array_map(
        static fn (array $row): array => noteRowToPayload($row),
        $stmt->fetchAll()
    );
}

function getActiveMembers(PDO $db, int $boardId): array
{
    $cutoff = gmdate(DATE_ATOM, time() - MEMBER_ACTIVE_WINDOW_SECONDS);
    $stmt = $db->prepare(
        'SELECT * FROM board_members
         WHERE board_id = :board_id AND last_seen >= :cutoff
         ORDER BY is_teacher DESC, user_name ASC'
    );
    $stmt->execute([
        ':board_id' => $boardId,
        ':cutoff' => $cutoff,
    ]);

    return array_map(
        static fn (array $row): array => memberRowToPayload($row, $db),
        $stmt->fetchAll()
    );
}

function touchBoard(PDO $db, int $boardId, string $timestamp): void
{
    $stmt = $db->prepare('UPDATE boards SET updated_at = :updated_at WHERE id = :id');
    $stmt->execute([
        ':updated_at' => $timestamp,
        ':id' => $boardId,
    ]);
}

function registerBoardMember(PDO $db, array $board, string $clientId, string $userName, bool $isTeacher, string $timestamp): void
{
    if ($clientId === '') {
        return;
    }

    $stmt = $db->prepare(
        'INSERT INTO board_members (board_id, client_id, user_name, is_teacher, joined_at, last_seen)
         VALUES (:board_id, :client_id, :user_name, :is_teacher, :joined_at, :last_seen)
         ON DUPLICATE KEY UPDATE
           user_name = VALUES(user_name),
           is_teacher = VALUES(is_teacher),
           last_seen = VALUES(last_seen)'
    );
    $stmt->execute([
        ':board_id' => (int) $board['id'],
        ':client_id' => $clientId,
        ':user_name' => mb_substr($userName !== '' ? $userName : 'User01', 0, 60),
        ':is_teacher' => $isTeacher ? 1 : 0,
        ':joined_at' => $timestamp,
        ':last_seen' => $timestamp,
    ]);
}

function removeBoardMember(PDO $db, int $boardId, string $clientId): void
{
    $stmt = $db->prepare('DELETE FROM board_members WHERE board_id = :board_id AND client_id = :client_id');
    $stmt->execute([
        ':board_id' => $boardId,
        ':client_id' => $clientId,
    ]);
}

function getActiveBan(PDO $db, int $boardId, string $clientId): ?array
{
    if ($clientId === '') {
        return null;
    }

    $stmt = $db->prepare(
        'SELECT * FROM board_bans
         WHERE board_id = :board_id AND client_id = :client_id AND banned_until > :now
         LIMIT 1'
    );
    $stmt->execute([
        ':board_id' => $boardId,
        ':client_id' => $clientId,
        ':now' => nowIso(),
    ]);

    $row = $stmt->fetch();
    return $row ?: null;
}

function ensureNotBanned(PDO $db, array $board, string $clientId): void
{
    $ban = getActiveBan($db, (int) $board['id'], $clientId);
    if ($ban === null) {
        return;
    }

    respond(403, [
        'error' => 'You are temporarily blocked from this board.',
        'bannedUntil' => $ban['banned_until'],
    ]);
}

function issueTeacherToken(PDO $db, array $board, string $clientId): string
{
    $token = generateToken();
    $stmt = $db->prepare(
        'UPDATE boards SET teacher_token_hash = :teacher_token_hash, teacher_client_id = :teacher_client_id WHERE id = :id'
    );
    $stmt->execute([
        ':teacher_token_hash' => password_hash($token, PASSWORD_DEFAULT),
        ':teacher_client_id' => $clientId,
        ':id' => (int) $board['id'],
    ]);

    return $token;
}

function isTeacherAuthorized(array $board, ?string $teacherToken): bool
{
    if (!(bool) $board['supervised_mode']) {
        return false;
    }

    if ($teacherToken === null || $teacherToken === '' || empty($board['teacher_token_hash'])) {
        return false;
    }

    return password_verify($teacherToken, (string) $board['teacher_token_hash']);
}

function requireTeacher(array $board, ?string $teacherToken): void
{
    if (!isTeacherAuthorized($board, $teacherToken)) {
        respond(403, ['error' => 'Teacher access required.']);
    }
}

function clampBoardPosition(array $board, int $x, int $y): array
{
    $settings = settingsFromBoardRow($board);
    $maxX = $settings['maxBoardColumns'] > 0 ? max(0, ($settings['maxBoardColumns'] * NOTE_SIZE) - NOTE_SIZE) : null;
    $maxY = $settings['maxBoardRows'] > 0 ? max(0, ($settings['maxBoardRows'] * NOTE_SIZE) - NOTE_SIZE) : null;

    $x = max(0, $x);
    $y = max(0, $y);

    if ($maxX !== null) {
        $x = min($x, $maxX);
    }
    if ($maxY !== null) {
        $y = min($y, $maxY);
    }

    return [$x, $y];
}

function countNotesByOwner(PDO $db, int $boardId, string $clientId): int
{
    $stmt = $db->prepare('SELECT COUNT(*) FROM notes WHERE board_id = :board_id AND owner_client_id = :client_id');
    $stmt->execute([
        ':board_id' => $boardId,
        ':client_id' => $clientId,
    ]);

    return (int) $stmt->fetchColumn();
}

function assertNoteCreationAllowed(PDO $db, array $board, string $clientId, bool $isTeacher): void
{
    $settings = settingsFromBoardRow($board);
    if ((bool) $board['supervised_mode'] && !$isTeacher && !$settings['allowViewerCreateNotes']) {
        respond(403, ['error' => 'Users cannot add notes on this board.']);
    }

    if ($settings['maxNotesPerUser'] > 0 && !$isTeacher && countNotesByOwner($db, (int) $board['id'], $clientId) >= $settings['maxNotesPerUser']) {
        respond(403, ['error' => 'You have reached the maximum number of notes.']);
    }
}

function assertCanModifyNote(array $board, array $note, string $clientId, ?string $teacherToken, string $action): void
{
    if (isTeacherAuthorized($board, $teacherToken)) {
        return;
    }

    if (!(bool) $board['supervised_mode']) {
        return;
    }

    $ownsNote = $clientId !== '' && $clientId === $note['owner_client_id'];
    $settings = settingsFromBoardRow($board);

    if ($action === 'move' && $settings['allowOnlyOwnMove'] && !$ownsNote) {
        respond(403, ['error' => 'You can only move your own notes.']);
    }
    if ($action === 'delete' && $settings['allowOnlyOwnDelete'] && !$ownsNote) {
        respond(403, ['error' => 'You can only delete your own notes.']);
    }
    if ($action === 'edit' && $settings['allowOnlyOwnEdit'] && !$ownsNote) {
        respond(403, ['error' => 'You can only edit your own notes.']);
    }
}

function updateBoardSettings(PDO $db, int $boardId, array $settings): void
{
    $stmt = $db->prepare(
        'UPDATE boards
         SET allow_only_own_move = :allow_only_own_move,
             allow_only_own_delete = :allow_only_own_delete,
             allow_only_own_edit = :allow_only_own_edit,
             allow_viewer_create_notes = :allow_viewer_create_notes,
             max_notes_per_user = :max_notes_per_user,
             max_board_columns = :max_board_columns,
             max_board_rows = :max_board_rows,
             kick_block_minutes = :kick_block_minutes
         WHERE id = :id'
    );
    $stmt->execute([
        ':allow_only_own_move' => !empty($settings['allowOnlyOwnMove']) ? 1 : 0,
        ':allow_only_own_delete' => !empty($settings['allowOnlyOwnDelete']) ? 1 : 0,
        ':allow_only_own_edit' => !empty($settings['allowOnlyOwnEdit']) ? 1 : 0,
        ':allow_viewer_create_notes' => !empty($settings['allowViewerCreateNotes']) ? 1 : 0,
        ':max_notes_per_user' => max(0, (int) ($settings['maxNotesPerUser'] ?? 0)),
        ':max_board_columns' => max(MIN_BOARD_DIMENSION, (int) ($settings['maxBoardColumns'] ?? DEFAULT_BOARD_COLUMNS)),
        ':max_board_rows' => max(MIN_BOARD_DIMENSION, (int) ($settings['maxBoardRows'] ?? DEFAULT_BOARD_ROWS)),
        ':kick_block_minutes' => max(1, (int) ($settings['kickBlockMinutes'] ?? 15)),
        ':id' => $boardId,
    ]);
}

function kickBoardMember(PDO $db, array $board, string $clientId, bool $deleteNotes): void
{
    $minutes = max(1, (int) $board['kick_block_minutes']);
    $timestamp = nowIso();
    $bannedUntil = gmdate(DATE_ATOM, time() + ($minutes * 60));

    $banStmt = $db->prepare(
        'INSERT INTO board_bans (board_id, client_id, banned_until, created_at)
         VALUES (:board_id, :client_id, :banned_until, :created_at)
         ON DUPLICATE KEY UPDATE banned_until = VALUES(banned_until), created_at = VALUES(created_at)'
    );
    $banStmt->execute([
        ':board_id' => (int) $board['id'],
        ':client_id' => $clientId,
        ':banned_until' => $bannedUntil,
        ':created_at' => $timestamp,
    ]);

    removeBoardMember($db, (int) $board['id'], $clientId);

    if ($deleteNotes) {
        $deleteStmt = $db->prepare('DELETE FROM notes WHERE board_id = :board_id AND owner_client_id = :client_id');
        $deleteStmt->execute([
            ':board_id' => (int) $board['id'],
            ':client_id' => $clientId,
        ]);
    }

    touchBoard($db, (int) $board['id'], $timestamp);
}

try {
    $db = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';
    $body = readJsonBody();

    if ($method === 'POST' && $action === 'create_board') {
        $title = trim((string) ($body['title'] ?? 'New board'));
        $supervisedMode = !empty($body['supervisedMode']);
        $teacherName = trim((string) ($body['teacherName'] ?? 'User01'));
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($title === '') {
            $title = 'New board';
        }

        $timestamp = nowIso();
        $code = generateUniqueBoardCode($db);
        $teacherToken = $supervisedMode ? generateToken() : null;

        $stmt = $db->prepare(
            'INSERT INTO boards (
                code, title, created_at, updated_at, supervised_mode, teacher_token_hash, teacher_client_id,
                allow_only_own_move, allow_only_own_delete, allow_only_own_edit, allow_viewer_create_notes,
                max_notes_per_user, max_board_columns, max_board_rows, kick_block_minutes
            ) VALUES (
                :code, :title, :created_at, :updated_at, :supervised_mode, :teacher_token_hash, :teacher_client_id,
                0, 0, 0, 1, 0, :max_board_columns, :max_board_rows, 15
            )'
        );
        $stmt->execute([
            ':code' => $code,
            ':title' => mb_substr($title, 0, 120),
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
            ':supervised_mode' => $supervisedMode ? 1 : 0,
            ':teacher_token_hash' => $teacherToken !== null ? password_hash($teacherToken, PASSWORD_DEFAULT) : null,
            ':teacher_client_id' => $supervisedMode ? $clientId : null,
            ':max_board_columns' => DEFAULT_BOARD_COLUMNS,
            ':max_board_rows' => DEFAULT_BOARD_ROWS,
        ]);

        $board = getBoardByCode($db, $code);
        registerBoardMember($db, $board, $clientId, $teacherName, $supervisedMode, $timestamp);

        $payload = ['board' => boardRowToPayload($board, $supervisedMode)];
        if ($teacherToken !== null) {
            $payload['teacherToken'] = $teacherToken;
        }

        respond(201, $payload);
    }

    if ($method === 'GET' && $action === 'board') {
        $code = normalizeCode((string) ($_GET['code'] ?? ''));
        $clientId = normalizeClientId((string) ($_GET['clientId'] ?? ''));
        $userName = trim((string) ($_GET['userName'] ?? ''));
        $teacherToken = (string) ($_GET['teacherToken'] ?? '');

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        $isTeacher = isTeacherAuthorized($board, $teacherToken);
        registerBoardMember($db, $board, $clientId, $userName, $isTeacher, nowIso());

        $payload = [
            'board' => boardRowToPayload($board, $isTeacher),
            'notes' => getNotesForBoard($db, (int) $board['id']),
        ];

        if ($isTeacher) {
            $payload['members'] = getActiveMembers($db, (int) $board['id']);
        }

        respond(200, $payload);
    }

    if ($method === 'GET' && $action === 'board_access') {
        $code = normalizeCode((string) ($_GET['code'] ?? ''));

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        respond(200, [
            'board' => [
                'code' => $board['code'],
                'title' => $board['title'],
                'supervisedMode' => (bool) $board['supervised_mode'],
                'teacherLoginAvailable' => (bool) $board['supervised_mode'] && !empty($board['teacher_pin_hash']),
            ],
        ]);
    }

    if ($method === 'POST' && $action === 'join_board') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));
        $userName = trim((string) ($body['userName'] ?? 'User01'));
        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        registerBoardMember($db, $board, $clientId, $userName, false, nowIso());

        respond(200, ['board' => boardRowToPayload($board, false)]);
    }

    if ($method === 'POST' && $action === 'teacher_login') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $pin = normalizePin((string) ($body['pin'] ?? ''));
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));
        $userName = trim((string) ($body['userName'] ?? 'User01'));

        if ($code === '' || $pin === '') {
            respond(422, ['error' => 'Missing board code or pin.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }
        if (!(bool) $board['supervised_mode'] || empty($board['teacher_pin_hash'])) {
            respond(403, ['error' => 'Teacher pin is not available for this board.']);
        }
        if (!password_verify($pin, (string) $board['teacher_pin_hash'])) {
            respond(403, ['error' => 'Incorrect pincode.']);
        }

        $teacherToken = issueTeacherToken($db, $board, $clientId);
        $board = getBoardByCode($db, $code);
        registerBoardMember($db, $board, $clientId, $userName, true, nowIso());

        respond(200, [
            'board' => boardRowToPayload($board, true),
            'teacherToken' => $teacherToken,
            'notes' => getNotesForBoard($db, (int) $board['id']),
            'members' => getActiveMembers($db, (int) $board['id']),
        ]);
    }

    if ($method === 'POST' && $action === 'set_teacher_pin') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $pin = normalizePin((string) ($body['pin'] ?? ''));
        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        requireTeacher($board, (string) ($body['teacherToken'] ?? ''));
        if (strlen($pin) !== 4) {
            respond(422, ['error' => 'Pincode must be exactly 4 digits.']);
        }

        $stmt = $db->prepare('UPDATE boards SET teacher_pin_hash = :teacher_pin_hash WHERE id = :id');
        $stmt->execute([
            ':teacher_pin_hash' => password_hash($pin, PASSWORD_DEFAULT),
            ':id' => (int) $board['id'],
        ]);

        respond(200, ['saved' => true]);
    }

    if ($method === 'POST' && $action === 'update_supervised_settings') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        requireTeacher($board, (string) ($body['teacherToken'] ?? ''));
        updateBoardSettings($db, (int) $board['id'], (array) ($body['settings'] ?? []));
        touchBoard($db, (int) $board['id'], nowIso());
        $board = getBoardByCode($db, $code);

        respond(200, ['board' => boardRowToPayload($board, true)]);
    }

    if ($method === 'POST' && $action === 'kick_member') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $targetClientId = normalizeClientId((string) ($body['targetClientId'] ?? ''));
        $deleteNotes = !empty($body['deleteNotes']);

        if ($targetClientId === '') {
            respond(422, ['error' => 'Missing member id.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        requireTeacher($board, (string) ($body['teacherToken'] ?? ''));
        if ($targetClientId === (string) $board['teacher_client_id']) {
            respond(422, ['error' => 'Teacher cannot be kicked.']);
        }

        kickBoardMember($db, $board, $targetClientId, $deleteNotes);
        respond(200, ['members' => getActiveMembers($db, (int) $board['id'])]);
    }

    if ($method === 'POST' && $action === 'update_board') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $title = trim((string) ($body['title'] ?? ''));

        if ($code === '' || $title === '') {
            respond(422, ['error' => 'Missing board code or title.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        if ((bool) $board['supervised_mode']) {
            requireTeacher($board, (string) ($body['teacherToken'] ?? ''));
        }

        $timestamp = nowIso();
        $stmt = $db->prepare('UPDATE boards SET title = :title, updated_at = :updated_at WHERE id = :id');
        $stmt->execute([
            ':title' => mb_substr($title, 0, 120),
            ':updated_at' => $timestamp,
            ':id' => (int) $board['id'],
        ]);

        $board = getBoardByCode($db, $code);
        respond(200, ['board' => boardRowToPayload($board, isTeacherAuthorized($board, (string) ($body['teacherToken'] ?? '')))]);
    }

    if ($method === 'POST' && $action === 'create_note') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $author = trim((string) ($body['author'] ?? 'User01'));
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        $isTeacher = isTeacherAuthorized($board, (string) ($body['teacherToken'] ?? ''));
        assertNoteCreationAllowed($db, $board, $clientId, $isTeacher);

        $timestamp = nowIso();
        $zQuery = $db->prepare('SELECT COALESCE(MAX(z_index), 0) AS max_z FROM notes WHERE board_id = :board_id');
        $zQuery->execute([':board_id' => (int) $board['id']]);
        $zIndex = ((int) ($zQuery->fetch()['max_z'] ?? 0)) + 1;

        [$x, $y] = clampBoardPosition($board, (int) ($body['x'] ?? 48), (int) ($body['y'] ?? 48));

        $stmt = $db->prepare(
            'INSERT INTO notes (
                board_id, owner_client_id, author, content, color, font_family, font_size, is_bold, is_italic, is_underline,
                pos_x, pos_y, z_index, created_at, updated_at
            ) VALUES (
                :board_id, :owner_client_id, :author, :content, :color, :font_family, :font_size, :is_bold, :is_italic, :is_underline,
                :pos_x, :pos_y, :z_index, :created_at, :updated_at
            )'
        );
        $stmt->execute([
            ':board_id' => (int) $board['id'],
            ':owner_client_id' => $clientId,
            ':author' => mb_substr($author !== '' ? $author : 'User01', 0, 60),
            ':content' => mb_substr((string) ($body['content'] ?? ''), 0, 3000),
            ':color' => (string) ($body['color'] ?? 'yellow'),
            ':font_family' => (string) ($body['fontFamily'] ?? 'comic'),
            ':font_size' => max(14, min(42, (int) ($body['fontSize'] ?? 22))),
            ':is_bold' => !empty($body['isBold']) ? 1 : 0,
            ':is_italic' => !empty($body['isItalic']) ? 1 : 0,
            ':is_underline' => !empty($body['isUnderline']) ? 1 : 0,
            ':pos_x' => $x,
            ':pos_y' => $y,
            ':z_index' => max(1, (int) ($body['zIndex'] ?? $zIndex)),
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);

        $noteId = (int) $db->lastInsertId();
        touchBoard($db, (int) $board['id'], $timestamp);
        $note = getNoteById($db, $noteId);

        respond(201, ['note' => noteRowToPayload($note)]);
    }

    if ($method === 'POST' && $action === 'update_note') {
        $noteId = (int) ($body['id'] ?? 0);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($noteId <= 0) {
            respond(422, ['error' => 'Missing note id.']);
        }

        $existing = getNoteById($db, $noteId);
        if ($existing === null) {
            respond(404, ['error' => 'Note not found.']);
        }

        $board = getBoardByCode($db, (string) getBoardByIdCode($db, (int) $existing['board_id']));
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        $moving = ((int) ($body['x'] ?? $existing['pos_x'])) !== (int) $existing['pos_x']
            || ((int) ($body['y'] ?? $existing['pos_y'])) !== (int) $existing['pos_y'];
        assertCanModifyNote($board, $existing, $clientId, (string) ($body['teacherToken'] ?? ''), $moving ? 'move' : 'edit');

        [$x, $y] = clampBoardPosition($board, (int) ($body['x'] ?? $existing['pos_x']), (int) ($body['y'] ?? $existing['pos_y']));

        $timestamp = nowIso();
        $stmt = $db->prepare(
            'UPDATE notes
             SET author = :author,
                 content = :content,
                 color = :color,
                 font_family = :font_family,
                 font_size = :font_size,
                 is_bold = :is_bold,
                 is_italic = :is_italic,
                 is_underline = :is_underline,
                 pos_x = :pos_x,
                 pos_y = :pos_y,
                 z_index = :z_index,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            ':author' => mb_substr(trim((string) ($body['author'] ?? $existing['author'])), 0, 60),
            ':content' => mb_substr((string) ($body['content'] ?? $existing['content']), 0, 3000),
            ':color' => (string) ($body['color'] ?? $existing['color']),
            ':font_family' => (string) ($body['fontFamily'] ?? $existing['font_family']),
            ':font_size' => max(14, min(42, (int) ($body['fontSize'] ?? $existing['font_size']))),
            ':is_bold' => !empty($body['isBold']) ? 1 : 0,
            ':is_italic' => !empty($body['isItalic']) ? 1 : 0,
            ':is_underline' => !empty($body['isUnderline']) ? 1 : 0,
            ':pos_x' => $x,
            ':pos_y' => $y,
            ':z_index' => max(1, (int) ($body['zIndex'] ?? $existing['z_index'])),
            ':updated_at' => $timestamp,
            ':id' => $noteId,
        ]);

        touchBoard($db, (int) $existing['board_id'], $timestamp);
        $note = getNoteById($db, $noteId);

        respond(200, ['note' => noteRowToPayload($note)]);
    }

    if ($method === 'POST' && $action === 'delete_note') {
        $noteId = (int) ($body['id'] ?? 0);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($noteId <= 0) {
            respond(422, ['error' => 'Missing note id.']);
        }

        $existing = getNoteById($db, $noteId);
        if ($existing === null) {
            respond(404, ['error' => 'Note not found.']);
        }

        $board = getBoardByCode($db, (string) getBoardByIdCode($db, (int) $existing['board_id']));
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        assertCanModifyNote($board, $existing, $clientId, (string) ($body['teacherToken'] ?? ''), 'delete');

        $timestamp = nowIso();
        $stmt = $db->prepare('DELETE FROM notes WHERE id = :id');
        $stmt->execute([':id' => $noteId]);
        touchBoard($db, (int) $existing['board_id'], $timestamp);

        respond(200, ['deleted' => true, 'id' => $noteId]);
    }

    respond(404, ['error' => 'Unknown endpoint.']);
} catch (Throwable $exception) {
    respond(500, ['error' => $exception->getMessage()]);
}

function getBoardByIdCode(PDO $db, int $boardId): ?string
{
    $stmt = $db->prepare('SELECT code FROM boards WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $boardId]);
    $row = $stmt->fetch();
    return $row['code'] ?? null;
}
