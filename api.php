<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const DB_HOST = 'database';
const DB_PORT = 3306;
const DB_NAME = 'sticky';
const DB_USER = 'root';
const DB_PASSWORD = '';
const NOTE_SIZE = 240;
const LABEL_TEXT_LIMIT = 180;
const DEFAULT_LABEL_FONT_SIZE = 26;
const MIN_LABEL_FONT_SIZE = 22;
const MAX_LABEL_FONT_SIZE = 42;
const MEMBER_ACTIVE_WINDOW_SECONDS = 300;
const DEFAULT_BOARD_COLUMNS = 10;
const DEFAULT_BOARD_ROWS = 5;
const MIN_BOARD_COLUMNS = 10;
const MIN_BOARD_ROWS = 5;

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
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function respondText(int $status, string $payload, string $contentType, ?string $downloadName = null): never
{
    http_response_code($status);
    header('Content-Type: ' . $contentType);
    if ($downloadName !== null) {
        header('Content-Disposition: attachment; filename="' . $downloadName . '"');
    }
    echo $payload;
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

    ensureSchema($pdo);

    return $pdo;
}

function tableExists(PDO $db, string $table): bool
{
    $stmt = $db->query('SHOW TABLES LIKE ' . $db->quote($table));
    return (bool) $stmt->fetchColumn();
}

function columnExists(PDO $db, string $table, string $column): bool
{
    $stmt = $db->query(sprintf('SHOW COLUMNS FROM `%s` LIKE %s', $table, $db->quote($column)));
    return (bool) $stmt->fetch();
}

function ensureSchema(PDO $db): void
{
    if (!columnExists($db, 'boards', 'likes_enabled')) {
        $db->exec('ALTER TABLE boards ADD COLUMN likes_enabled TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_viewer_create_notes');
    }
    if (!columnExists($db, 'boards', 'line_columns')) {
        $db->exec('ALTER TABLE boards ADD COLUMN line_columns INT NOT NULL DEFAULT 0 AFTER max_board_rows');
    }
    if (!columnExists($db, 'boards', 'line_rows')) {
        $db->exec('ALTER TABLE boards ADD COLUMN line_rows INT NOT NULL DEFAULT 0 AFTER line_columns');
    }

    if (!tableExists($db, 'note_likes')) {
        $db->exec(
            'CREATE TABLE note_likes (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                board_id BIGINT UNSIGNED NOT NULL,
                note_id BIGINT UNSIGNED NOT NULL,
                client_id VARCHAR(64) NOT NULL,
                user_name VARCHAR(60) NOT NULL,
                created_at VARCHAR(35) NOT NULL,
                PRIMARY KEY (id),
                UNIQUE KEY uq_note_likes_note_client (note_id, client_id),
                KEY idx_note_likes_board_id (board_id),
                KEY idx_note_likes_note_id (note_id),
                CONSTRAINT fk_note_likes_board FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE,
                CONSTRAINT fk_note_likes_note FOREIGN KEY (note_id) REFERENCES notes (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    if (!tableExists($db, 'board_labels')) {
        $db->exec(
            'CREATE TABLE board_labels (
                id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
                board_id BIGINT UNSIGNED NOT NULL,
                owner_client_id VARCHAR(64) NOT NULL,
                author VARCHAR(60) NOT NULL,
                text VARCHAR(180) NOT NULL,
                font_size INT NOT NULL DEFAULT 26,
                pos_x INT NOT NULL DEFAULT 48,
                pos_y INT NOT NULL DEFAULT 48,
                z_index INT NOT NULL DEFAULT 1,
                created_at VARCHAR(35) NOT NULL,
                updated_at VARCHAR(35) NOT NULL,
                PRIMARY KEY (id),
                KEY idx_board_labels_board_id (board_id),
                CONSTRAINT fk_board_labels_board FOREIGN KEY (board_id) REFERENCES boards (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }
    if (!columnExists($db, 'board_labels', 'font_size')) {
        $db->exec('ALTER TABLE board_labels ADD COLUMN font_size INT NOT NULL DEFAULT 26 AFTER text');
    }
}

function normalizeCode(string $code): string
{
    return strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', strtoupper($code)) ?? '', 0, 6));
}

function normalizeClientId(string $clientId): string
{
    return substr(preg_replace('/[^a-zA-Z0-9_-]/', '', $clientId) ?? '', 0, 64);
}

function normalizeLabelFontSize(int $fontSize): int
{
    return max(MIN_LABEL_FONT_SIZE, min(MAX_LABEL_FONT_SIZE, $fontSize));
}

function labelHeightForFontSize(int $fontSize): int
{
    return max(84, (int) round($fontSize * 2.9));
}

function clampBoardLabelPosition(array $board, int $x, int $y, int $fontSize): array
{
    $settings = settingsFromBoardRow($board);
    $maxX = max(0, ($settings['maxBoardColumns'] * NOTE_SIZE) - 260);
    $maxY = max(0, ($settings['maxBoardRows'] * NOTE_SIZE) - labelHeightForFontSize($fontSize));

    return [
        max(0, min($x, $maxX)),
        max(0, min($y, $maxY)),
    ];
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

function requestAdminToken(array $source): string
{
    return (string) ($source['adminToken'] ?? $source['teacherToken'] ?? '');
}

function requestManagementMode(array $source): bool
{
    return !empty($source['managementMode']) || !empty($source['supervisedMode']);
}

function requestAdminName(array $source): string
{
    return trim((string) ($source['adminName'] ?? $source['teacherName'] ?? 'User01'));
}

function settingsFromBoardRow(array $board): array
{
    $maxBoardColumns = max(MIN_BOARD_COLUMNS, (int) ($board['max_board_columns'] ?? DEFAULT_BOARD_COLUMNS));
    $maxBoardRows = max(MIN_BOARD_ROWS, (int) ($board['max_board_rows'] ?? DEFAULT_BOARD_ROWS));
    $lineColumns = max(0, (int) ($board['line_columns'] ?? 0));
    $lineRows = max(0, (int) ($board['line_rows'] ?? 0));
    if ($lineColumns > 0) {
        $lineColumns = max(2, $lineColumns);
    }
    if ($lineRows > 0) {
        $lineRows = max(2, $lineRows);
    }

    return [
        'allowOnlyOwnMove' => (bool) $board['allow_only_own_move'],
        'allowOnlyOwnDelete' => (bool) $board['allow_only_own_delete'],
        'allowOnlyOwnEdit' => (bool) $board['allow_only_own_edit'],
        'allowViewerCreateNotes' => (bool) $board['allow_viewer_create_notes'],
        'likesEnabled' => array_key_exists('likes_enabled', $board) ? (bool) $board['likes_enabled'] : true,
        'maxNotesPerUser' => (int) $board['max_notes_per_user'],
        'maxBoardColumns' => $maxBoardColumns,
        'maxBoardRows' => $maxBoardRows,
        'lineColumns' => $lineColumns,
        'lineRows' => $lineRows,
        'kickBlockMinutes' => (int) $board['kick_block_minutes'],
    ];
}

function boardRowToPayload(array $board, bool $isAdmin = false): array
{
    return [
        'id' => (int) $board['id'],
        'code' => $board['code'],
        'title' => $board['title'],
        'createdAt' => $board['created_at'],
        'updatedAt' => $board['updated_at'],
        'managementMode' => (bool) $board['supervised_mode'],
        'isAdmin' => $isAdmin,
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
        'likesCount' => (int) ($note['likes_count'] ?? 0),
        'isLikedByCurrentUser' => (bool) ($note['is_liked_by_user'] ?? false),
    ];
}

function labelRowToPayload(array $label): array
{
    return [
        'id' => (int) $label['id'],
        'boardId' => (int) $label['board_id'],
        'author' => $label['author'],
        'text' => $label['text'],
        'fontSize' => normalizeLabelFontSize((int) ($label['font_size'] ?? DEFAULT_LABEL_FONT_SIZE)),
        'x' => (int) $label['pos_x'],
        'y' => (int) $label['pos_y'],
        'zIndex' => (int) $label['z_index'],
        'createdAt' => $label['created_at'],
        'updatedAt' => $label['updated_at'],
        'ownerClientId' => $label['owner_client_id'],
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
        'isAdmin' => (bool) $member['is_teacher'],
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

function getBoardById(PDO $db, int $boardId): ?array
{
    $stmt = $db->prepare('SELECT * FROM boards WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $boardId]);
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

function getNotesForBoard(PDO $db, int $boardId, string $viewerClientId = ''): array
{
    $stmt = $db->prepare(
        'SELECT notes.*,
                COALESCE(note_like_counts.like_count, 0) AS likes_count,
                CASE WHEN viewer_note_likes.note_id IS NULL THEN 0 ELSE 1 END AS is_liked_by_user
         FROM notes
         LEFT JOIN (
             SELECT note_id, COUNT(*) AS like_count
             FROM note_likes
             GROUP BY note_id
         ) AS note_like_counts ON note_like_counts.note_id = notes.id
         LEFT JOIN note_likes AS viewer_note_likes
           ON viewer_note_likes.note_id = notes.id AND viewer_note_likes.client_id = :viewer_client_id
         WHERE notes.board_id = :board_id
         ORDER BY notes.z_index ASC, notes.id ASC'
    );
    $stmt->execute([
        ':board_id' => $boardId,
        ':viewer_client_id' => normalizeClientId($viewerClientId),
    ]);

    return array_map(
        static fn (array $row): array => noteRowToPayload($row),
        $stmt->fetchAll()
    );
}

function getNotePayloadById(PDO $db, int $noteId, string $viewerClientId = ''): ?array
{
    $stmt = $db->prepare(
        'SELECT notes.*,
                COALESCE(note_like_counts.like_count, 0) AS likes_count,
                CASE WHEN viewer_note_likes.note_id IS NULL THEN 0 ELSE 1 END AS is_liked_by_user
         FROM notes
         LEFT JOIN (
             SELECT note_id, COUNT(*) AS like_count
             FROM note_likes
             GROUP BY note_id
         ) AS note_like_counts ON note_like_counts.note_id = notes.id
         LEFT JOIN note_likes AS viewer_note_likes
           ON viewer_note_likes.note_id = notes.id AND viewer_note_likes.client_id = :viewer_client_id
         WHERE notes.id = :id
         LIMIT 1'
    );
    $stmt->execute([
        ':id' => $noteId,
        ':viewer_client_id' => normalizeClientId($viewerClientId),
    ]);
    $row = $stmt->fetch();

    return $row ? noteRowToPayload($row) : null;
}

function getLabelById(PDO $db, int $labelId): ?array
{
    $stmt = $db->prepare('SELECT * FROM board_labels WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $labelId]);
    $row = $stmt->fetch();

    return $row ?: null;
}

function getLabelsForBoard(PDO $db, int $boardId): array
{
    $stmt = $db->prepare('SELECT * FROM board_labels WHERE board_id = :board_id ORDER BY z_index ASC, id ASC');
    $stmt->execute([':board_id' => $boardId]);

    return array_map(
        static fn (array $row): array => labelRowToPayload($row),
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

function registerBoardMember(PDO $db, array $board, string $clientId, string $userName, bool $isAdmin, string $timestamp): void
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
        ':is_teacher' => $isAdmin ? 1 : 0,
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

function issueAdminToken(PDO $db, array $board, string $clientId): string
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

function isAdminAuthorized(array $board, ?string $adminToken): bool
{
    if (!(bool) $board['supervised_mode']) {
        return false;
    }

    if ($adminToken === null || $adminToken === '' || empty($board['teacher_token_hash'])) {
        return false;
    }

    return password_verify($adminToken, (string) $board['teacher_token_hash']);
}

function requireAdmin(array $board, ?string $adminToken): void
{
    if (!isAdminAuthorized($board, $adminToken)) {
        respond(403, ['error' => 'Admin access required.']);
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

function assertNoteCreationAllowed(PDO $db, array $board, string $clientId, bool $isAdmin): void
{
    $settings = settingsFromBoardRow($board);
    if ((bool) $board['supervised_mode'] && !$isAdmin && !$settings['allowViewerCreateNotes']) {
        respond(403, ['error' => 'Users cannot add notes on this board.']);
    }

    if ($settings['maxNotesPerUser'] > 0 && !$isAdmin && countNotesByOwner($db, (int) $board['id'], $clientId) >= $settings['maxNotesPerUser']) {
        respond(403, ['error' => 'You have reached the maximum number of notes.']);
    }
}

function assertCanModifyOwnedEntity(array $board, string $ownerClientId, string $clientId, ?string $adminToken, string $action): void
{
    if (isAdminAuthorized($board, $adminToken)) {
        return;
    }

    if (!(bool) $board['supervised_mode']) {
        return;
    }

    $ownsNote = $clientId !== '' && $clientId === $ownerClientId;
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

function assertCanModifyNote(array $board, array $note, string $clientId, ?string $adminToken, string $action): void
{
    assertCanModifyOwnedEntity($board, (string) $note['owner_client_id'], $clientId, $adminToken, $action);
}

function assertCanModifyLabel(array $board, array $label, string $clientId, ?string $adminToken, string $action): void
{
    if ((bool) $board['supervised_mode'] && !isAdminAuthorized($board, $adminToken)) {
        respond(403, ['error' => 'Only admins can modify labels on this board.']);
    }

    assertCanModifyOwnedEntity($board, (string) $label['owner_client_id'], $clientId, $adminToken, $action);
}

function updateBoardSettings(PDO $db, int $boardId, array $settings): void
{
    $lineColumns = max(0, (int) ($settings['lineColumns'] ?? 0));
    $lineRows = max(0, (int) ($settings['lineRows'] ?? 0));
    if ($lineColumns > 0) {
        $lineColumns = max(2, $lineColumns);
    }
    if ($lineRows > 0) {
        $lineRows = max(2, $lineRows);
    }

    $stmt = $db->prepare(
        'UPDATE boards
         SET allow_only_own_move = :allow_only_own_move,
             allow_only_own_delete = :allow_only_own_delete,
             allow_only_own_edit = :allow_only_own_edit,
             allow_viewer_create_notes = :allow_viewer_create_notes,
             likes_enabled = :likes_enabled,
             max_notes_per_user = :max_notes_per_user,
             max_board_columns = :max_board_columns,
             max_board_rows = :max_board_rows,
             line_columns = :line_columns,
             line_rows = :line_rows,
             kick_block_minutes = :kick_block_minutes
         WHERE id = :id'
    );
    $stmt->execute([
        ':allow_only_own_move' => !empty($settings['allowOnlyOwnMove']) ? 1 : 0,
        ':allow_only_own_delete' => !empty($settings['allowOnlyOwnDelete']) ? 1 : 0,
        ':allow_only_own_edit' => !empty($settings['allowOnlyOwnEdit']) ? 1 : 0,
        ':allow_viewer_create_notes' => !empty($settings['allowViewerCreateNotes']) ? 1 : 0,
        ':likes_enabled' => !empty($settings['likesEnabled']) ? 1 : 0,
        ':max_notes_per_user' => max(0, (int) ($settings['maxNotesPerUser'] ?? 0)),
        ':max_board_columns' => max(MIN_BOARD_COLUMNS, (int) ($settings['maxBoardColumns'] ?? DEFAULT_BOARD_COLUMNS)),
        ':max_board_rows' => max(MIN_BOARD_ROWS, (int) ($settings['maxBoardRows'] ?? DEFAULT_BOARD_ROWS)),
        ':line_columns' => $lineColumns,
        ':line_rows' => $lineRows,
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
        $managementMode = requestManagementMode($body);
        $adminName = requestAdminName($body);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($title === '') {
            $title = 'New board';
        }

        $timestamp = nowIso();
        $code = generateUniqueBoardCode($db);
        $adminToken = $managementMode ? generateToken() : null;

        $stmt = $db->prepare(
            'INSERT INTO boards (
                code, title, created_at, updated_at, supervised_mode, teacher_token_hash, teacher_client_id,
                allow_only_own_move, allow_only_own_delete, allow_only_own_edit, allow_viewer_create_notes, likes_enabled,
                max_notes_per_user, max_board_columns, max_board_rows, line_columns, line_rows, kick_block_minutes
            ) VALUES (
                :code, :title, :created_at, :updated_at, :supervised_mode, :teacher_token_hash, :teacher_client_id,
                :allow_only_own_move, :allow_only_own_delete, :allow_only_own_edit, 1, 1, :max_notes_per_user, :max_board_columns, :max_board_rows, 0, 0, 15
            )'
        );
        $stmt->execute([
            ':code' => $code,
            ':title' => mb_substr($title, 0, 120),
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
            ':supervised_mode' => $managementMode ? 1 : 0,
            ':teacher_token_hash' => $adminToken !== null ? password_hash($adminToken, PASSWORD_DEFAULT) : null,
            ':teacher_client_id' => $managementMode ? $clientId : null,
            ':allow_only_own_move' => $managementMode ? 1 : 0,
            ':allow_only_own_delete' => $managementMode ? 1 : 0,
            ':allow_only_own_edit' => $managementMode ? 1 : 0,
            ':max_notes_per_user' => $managementMode ? 10 : 0,
            ':max_board_columns' => DEFAULT_BOARD_COLUMNS,
            ':max_board_rows' => DEFAULT_BOARD_ROWS,
        ]);

        $board = getBoardByCode($db, $code);
        registerBoardMember($db, $board, $clientId, $adminName, $managementMode, $timestamp);

        $payload = ['board' => boardRowToPayload($board, $managementMode)];
        if ($adminToken !== null) {
            $payload['adminToken'] = $adminToken;
        }

        respond(201, $payload);
    }

    if ($method === 'GET' && $action === 'board') {
        $code = normalizeCode((string) ($_GET['code'] ?? ''));
        $clientId = normalizeClientId((string) ($_GET['clientId'] ?? ''));
        $userName = trim((string) ($_GET['userName'] ?? ''));
        $adminToken = requestAdminToken($_GET);

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        $isAdmin = isAdminAuthorized($board, $adminToken);
        registerBoardMember($db, $board, $clientId, $userName, $isAdmin, nowIso());

        $payload = [
            'board' => boardRowToPayload($board, $isAdmin),
            'notes' => getNotesForBoard($db, (int) $board['id'], $clientId),
            'labels' => getLabelsForBoard($db, (int) $board['id']),
        ];

        if ($isAdmin) {
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
                'managementMode' => (bool) $board['supervised_mode'],
                'adminLoginAvailable' => (bool) $board['supervised_mode'] && !empty($board['teacher_pin_hash']),
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

    if ($method === 'POST' && ($action === 'admin_login' || $action === 'teacher_login')) {
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
            respond(403, ['error' => 'Admin pincode is not available for this board.']);
        }
        if (!password_verify($pin, (string) $board['teacher_pin_hash'])) {
            respond(403, ['error' => 'Incorrect pincode.']);
        }

        $adminToken = issueAdminToken($db, $board, $clientId);
        $board = getBoardByCode($db, $code);
        registerBoardMember($db, $board, $clientId, $userName, true, nowIso());

        respond(200, [
            'board' => boardRowToPayload($board, true),
            'adminToken' => $adminToken,
            'notes' => getNotesForBoard($db, (int) $board['id'], $clientId),
            'labels' => getLabelsForBoard($db, (int) $board['id']),
            'members' => getActiveMembers($db, (int) $board['id']),
        ]);
    }

    if ($method === 'POST' && ($action === 'set_admin_pin' || $action === 'set_teacher_pin')) {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $pin = normalizePin((string) ($body['pin'] ?? ''));
        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        requireAdmin($board, requestAdminToken($body));
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

    if ($method === 'POST' && ($action === 'update_management_settings' || $action === 'update_supervised_settings')) {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        requireAdmin($board, requestAdminToken($body));
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

        requireAdmin($board, requestAdminToken($body));
        if ($targetClientId === (string) $board['teacher_client_id']) {
            respond(422, ['error' => 'Admin cannot be kicked.']);
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
            requireAdmin($board, requestAdminToken($body));
        }

        $timestamp = nowIso();
        $stmt = $db->prepare('UPDATE boards SET title = :title, updated_at = :updated_at WHERE id = :id');
        $stmt->execute([
            ':title' => mb_substr($title, 0, 120),
            ':updated_at' => $timestamp,
            ':id' => (int) $board['id'],
        ]);

        $board = getBoardByCode($db, $code);
        respond(200, ['board' => boardRowToPayload($board, isAdminAuthorized($board, requestAdminToken($body)))]);
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
        $isAdmin = isAdminAuthorized($board, requestAdminToken($body));
        assertNoteCreationAllowed($db, $board, $clientId, $isAdmin);

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
        $note = getNotePayloadById($db, $noteId, $clientId);

        respond(201, ['note' => $note]);
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

        $board = getBoardById($db, (int) $existing['board_id']);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        $moving = ((int) ($body['x'] ?? $existing['pos_x'])) !== (int) $existing['pos_x']
            || ((int) ($body['y'] ?? $existing['pos_y'])) !== (int) $existing['pos_y'];
        assertCanModifyNote($board, $existing, $clientId, requestAdminToken($body), $moving ? 'move' : 'edit');

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
        $note = getNotePayloadById($db, $noteId, $clientId);

        respond(200, ['note' => $note]);
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

        $board = getBoardById($db, (int) $existing['board_id']);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        assertCanModifyNote($board, $existing, $clientId, requestAdminToken($body), 'delete');

        $timestamp = nowIso();
        $stmt = $db->prepare('DELETE FROM notes WHERE id = :id');
        $stmt->execute([':id' => $noteId]);
        touchBoard($db, (int) $existing['board_id'], $timestamp);

        respond(200, ['deleted' => true, 'id' => $noteId]);
    }

    if ($method === 'POST' && $action === 'toggle_note_like') {
        $noteId = (int) ($body['id'] ?? 0);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));
        $userName = trim((string) ($body['userName'] ?? 'User01'));
        $liked = !empty($body['liked']);

        if ($noteId <= 0 || $clientId === '') {
            respond(422, ['error' => 'Missing note id or client id.']);
        }

        $note = getNoteById($db, $noteId);
        if ($note === null) {
            respond(404, ['error' => 'Note not found.']);
        }

        $board = getBoardById($db, (int) $note['board_id']);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        $settings = settingsFromBoardRow($board);
        if (!$settings['likesEnabled']) {
            respond(403, ['error' => 'Likes are disabled on this board.']);
        }

        $timestamp = nowIso();
        if ($liked) {
            $stmt = $db->prepare(
                'INSERT INTO note_likes (board_id, note_id, client_id, user_name, created_at)
                 VALUES (:board_id, :note_id, :client_id, :user_name, :created_at)
                 ON DUPLICATE KEY UPDATE user_name = VALUES(user_name)'
            );
            $stmt->execute([
                ':board_id' => (int) $board['id'],
                ':note_id' => $noteId,
                ':client_id' => $clientId,
                ':user_name' => mb_substr($userName !== '' ? $userName : 'User01', 0, 60),
                ':created_at' => $timestamp,
            ]);
        } else {
            $stmt = $db->prepare('DELETE FROM note_likes WHERE note_id = :note_id AND client_id = :client_id');
            $stmt->execute([
                ':note_id' => $noteId,
                ':client_id' => $clientId,
            ]);
        }

        touchBoard($db, (int) $board['id'], $timestamp);
        $payload = getNotePayloadById($db, $noteId, $clientId);
        respond(200, ['note' => $payload]);
    }

    if ($method === 'POST' && $action === 'create_label') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $author = trim((string) ($body['author'] ?? 'User01'));
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));
        $text = trim((string) ($body['text'] ?? ''));

        if ($code === '' || $text === '') {
            respond(422, ['error' => 'Missing board code or label text.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        ensureNotBanned($db, $board, $clientId);
        $isAdmin = isAdminAuthorized($board, requestAdminToken($body));
        if ((bool) $board['supervised_mode'] && !$isAdmin) {
            respond(403, ['error' => 'Only admins can create labels on this board.']);
        }
        assertNoteCreationAllowed($db, $board, $clientId, $isAdmin);

        $timestamp = nowIso();
        $zQuery = $db->prepare('SELECT COALESCE(MAX(z_index), 0) AS max_z FROM board_labels WHERE board_id = :board_id');
        $zQuery->execute([':board_id' => (int) $board['id']]);
        $zIndex = ((int) ($zQuery->fetch()['max_z'] ?? 0)) + 1;

        $fontSize = normalizeLabelFontSize((int) ($body['fontSize'] ?? DEFAULT_LABEL_FONT_SIZE));
        [$x, $y] = clampBoardLabelPosition($board, (int) ($body['x'] ?? 48), (int) ($body['y'] ?? 48), $fontSize);

        $stmt = $db->prepare(
            'INSERT INTO board_labels (
                board_id, owner_client_id, author, text, font_size, pos_x, pos_y, z_index, created_at, updated_at
            ) VALUES (
                :board_id, :owner_client_id, :author, :text, :font_size, :pos_x, :pos_y, :z_index, :created_at, :updated_at
            )'
        );
        $stmt->execute([
            ':board_id' => (int) $board['id'],
            ':owner_client_id' => $clientId,
            ':author' => mb_substr($author !== '' ? $author : 'User01', 0, 60),
            ':text' => mb_substr($text, 0, LABEL_TEXT_LIMIT),
            ':font_size' => $fontSize,
            ':pos_x' => $x,
            ':pos_y' => $y,
            ':z_index' => max(1, (int) ($body['zIndex'] ?? $zIndex)),
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);

        $labelId = (int) $db->lastInsertId();
        touchBoard($db, (int) $board['id'], $timestamp);
        $label = getLabelById($db, $labelId);

        respond(201, ['label' => labelRowToPayload($label)]);
    }

    if ($method === 'POST' && $action === 'update_label') {
        $labelId = (int) ($body['id'] ?? 0);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($labelId <= 0) {
            respond(422, ['error' => 'Missing label id.']);
        }

        $existing = getLabelById($db, $labelId);
        if ($existing === null) {
            respond(404, ['error' => 'Label not found.']);
        }

        $board = getBoardById($db, (int) $existing['board_id']);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        $moving = ((int) ($body['x'] ?? $existing['pos_x'])) !== (int) $existing['pos_x']
            || ((int) ($body['y'] ?? $existing['pos_y'])) !== (int) $existing['pos_y'];
        assertCanModifyLabel($board, $existing, $clientId, requestAdminToken($body), $moving ? 'move' : 'edit');

        $fontSize = normalizeLabelFontSize((int) ($body['fontSize'] ?? $existing['font_size'] ?? DEFAULT_LABEL_FONT_SIZE));
        [$x, $y] = clampBoardLabelPosition($board, (int) ($body['x'] ?? $existing['pos_x']), (int) ($body['y'] ?? $existing['pos_y']), $fontSize);
        $timestamp = nowIso();
        $stmt = $db->prepare(
            'UPDATE board_labels
             SET author = :author,
                 text = :text,
                 font_size = :font_size,
                 pos_x = :pos_x,
                 pos_y = :pos_y,
                 z_index = :z_index,
                 updated_at = :updated_at
             WHERE id = :id'
        );
        $stmt->execute([
            ':author' => mb_substr(trim((string) ($body['author'] ?? $existing['author'])), 0, 60),
            ':text' => mb_substr(trim((string) ($body['text'] ?? $existing['text'])), 0, LABEL_TEXT_LIMIT),
            ':font_size' => $fontSize,
            ':pos_x' => $x,
            ':pos_y' => $y,
            ':z_index' => max(1, (int) ($body['zIndex'] ?? $existing['z_index'])),
            ':updated_at' => $timestamp,
            ':id' => $labelId,
        ]);

        touchBoard($db, (int) $existing['board_id'], $timestamp);
        $label = getLabelById($db, $labelId);

        respond(200, ['label' => labelRowToPayload($label)]);
    }

    if ($method === 'POST' && $action === 'delete_label') {
        $labelId = (int) ($body['id'] ?? 0);
        $clientId = normalizeClientId((string) ($body['clientId'] ?? ''));

        if ($labelId <= 0) {
            respond(422, ['error' => 'Missing label id.']);
        }

        $existing = getLabelById($db, $labelId);
        if ($existing === null) {
            respond(404, ['error' => 'Label not found.']);
        }

        $board = getBoardById($db, (int) $existing['board_id']);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        assertCanModifyLabel($board, $existing, $clientId, requestAdminToken($body), 'delete');

        $timestamp = nowIso();
        $stmt = $db->prepare('DELETE FROM board_labels WHERE id = :id');
        $stmt->execute([':id' => $labelId]);
        touchBoard($db, (int) $existing['board_id'], $timestamp);

        respond(200, ['deleted' => true, 'id' => $labelId]);
    }

    if ($method === 'GET' && $action === 'export_board') {
        $code = normalizeCode((string) ($_GET['code'] ?? ''));
        $format = strtolower((string) ($_GET['format'] ?? 'txt'));
        $adminToken = requestAdminToken($_GET);

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }
        if (!in_array($format, ['txt', 'csv'], true)) {
            respond(422, ['error' => 'Unsupported export format.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }
        if ((bool) $board['supervised_mode']) {
            requireAdmin($board, $adminToken);
        }

        $notes = getNotesForBoard($db, (int) $board['id'], '');
        $safeCode = strtolower($board['code']);

        if ($format === 'csv') {
            $handle = fopen('php://temp', 'r+');
            fputcsv($handle, ['author', 'content', 'likes', 'color', 'x', 'y', 'updatedAt']);
            foreach ($notes as $note) {
                fputcsv($handle, [
                    $note['author'],
                    trim(preg_replace('/\s+/', ' ', strip_tags((string) $note['content'])) ?? ''),
                    $note['likesCount'],
                    $note['color'],
                    $note['x'],
                    $note['y'],
                    $note['updatedAt'],
                ]);
            }
            rewind($handle);
            $payload = stream_get_contents($handle) ?: '';
            fclose($handle);
            respondText(200, $payload, 'text/csv; charset=utf-8', sprintf('sticky-board-%s.csv', $safeCode));
        }

        $lines = [
            sprintf("Board: %s (%s)", $board['title'], $board['code']),
            sprintf("Exported: %s", nowIso()),
            '',
        ];
        foreach ($notes as $index => $note) {
            $lines[] = sprintf('%d. %s', $index + 1, $note['author']);
            $lines[] = trim(preg_replace('/\s+/', ' ', strip_tags((string) $note['content'])) ?? '');
            $lines[] = '';
        }
        respondText(200, implode("\n", $lines), 'text/plain; charset=utf-8', sprintf('sticky-board-%s.txt', $safeCode));
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
