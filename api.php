<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const DB_HOST = 'database';
const DB_PORT = 3306;
const DB_NAME = 'sticky';
const DB_USER = 'root';
const DB_PASSWORD = '';

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

function boardRowToPayload(array $board): array
{
    return [
        'id' => (int) $board['id'],
        'code' => $board['code'],
        'title' => $board['title'],
        'createdAt' => $board['created_at'],
        'updatedAt' => $board['updated_at'],
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

function touchBoard(PDO $db, int $boardId, string $timestamp): void
{
    $stmt = $db->prepare('UPDATE boards SET updated_at = :updated_at WHERE id = :id');
    $stmt->execute([
        ':updated_at' => $timestamp,
        ':id' => $boardId,
    ]);
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

try {
    $db = db();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $action = $_GET['action'] ?? '';
    $body = readJsonBody();

    if ($method === 'POST' && $action === 'create_board') {
        $title = trim((string) ($body['title'] ?? 'New board'));
        if ($title === '') {
            $title = 'New board';
        }

        $timestamp = gmdate(DATE_ATOM);
        $code = generateUniqueBoardCode($db);

        $stmt = $db->prepare(
            'INSERT INTO boards (code, title, created_at, updated_at) VALUES (:code, :title, :created_at, :updated_at)'
        );
        $stmt->execute([
            ':code' => $code,
            ':title' => mb_substr($title, 0, 120),
            ':created_at' => $timestamp,
            ':updated_at' => $timestamp,
        ]);

        $board = getBoardByCode($db, $code);
        respond(201, ['board' => boardRowToPayload($board)]);
    }

    if ($method === 'GET' && $action === 'board') {
        $code = normalizeCode((string) ($_GET['code'] ?? ''));
        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        respond(200, [
            'board' => boardRowToPayload($board),
            'notes' => getNotesForBoard($db, (int) $board['id']),
        ]);
    }

    if ($method === 'POST' && $action === 'join_board') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        respond(200, ['board' => boardRowToPayload($board)]);
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

        $timestamp = gmdate(DATE_ATOM);
        $stmt = $db->prepare('UPDATE boards SET title = :title, updated_at = :updated_at WHERE id = :id');
        $stmt->execute([
            ':title' => mb_substr($title, 0, 120),
            ':updated_at' => $timestamp,
            ':id' => (int) $board['id'],
        ]);

        $board = getBoardByCode($db, $code);
        respond(200, ['board' => boardRowToPayload($board)]);
    }

    if ($method === 'POST' && $action === 'create_note') {
        $code = normalizeCode((string) ($body['code'] ?? ''));
        $author = trim((string) ($body['author'] ?? 'User00'));

        if ($code === '') {
            respond(422, ['error' => 'Missing board code.']);
        }

        $board = getBoardByCode($db, $code);
        if ($board === null) {
            respond(404, ['error' => 'Board not found.']);
        }

        $timestamp = gmdate(DATE_ATOM);

        $zQuery = $db->prepare('SELECT COALESCE(MAX(z_index), 0) AS max_z FROM notes WHERE board_id = :board_id');
        $zQuery->execute([':board_id' => (int) $board['id']]);
        $zIndex = ((int) ($zQuery->fetch()['max_z'] ?? 0)) + 1;

        $stmt = $db->prepare(
            'INSERT INTO notes (
                board_id, author, content, color, font_family, font_size, is_bold, is_italic, is_underline,
                pos_x, pos_y, z_index, created_at, updated_at
            ) VALUES (
                :board_id, :author, :content, :color, :font_family, :font_size, :is_bold, :is_italic, :is_underline,
                :pos_x, :pos_y, :z_index, :created_at, :updated_at
            )'
        );
        $stmt->execute([
            ':board_id' => (int) $board['id'],
            ':author' => mb_substr($author !== '' ? $author : 'User00', 0, 60),
            ':content' => '',
            ':color' => 'yellow',
            ':font_family' => 'comic',
            ':font_size' => 22,
            ':is_bold' => 0,
            ':is_italic' => 0,
            ':is_underline' => 0,
            ':pos_x' => (int) ($body['x'] ?? 48),
            ':pos_y' => (int) ($body['y'] ?? 48),
            ':z_index' => $zIndex,
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
        if ($noteId <= 0) {
            respond(422, ['error' => 'Missing note id.']);
        }

        $existing = getNoteById($db, $noteId);
        if ($existing === null) {
            respond(404, ['error' => 'Note not found.']);
        }

        $timestamp = gmdate(DATE_ATOM);
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
            ':pos_x' => max(0, (int) ($body['x'] ?? $existing['pos_x'])),
            ':pos_y' => max(0, (int) ($body['y'] ?? $existing['pos_y'])),
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
        if ($noteId <= 0) {
            respond(422, ['error' => 'Missing note id.']);
        }

        $existing = getNoteById($db, $noteId);
        if ($existing === null) {
            respond(404, ['error' => 'Note not found.']);
        }

        $timestamp = gmdate(DATE_ATOM);
        $stmt = $db->prepare('DELETE FROM notes WHERE id = :id');
        $stmt->execute([':id' => $noteId]);
        touchBoard($db, (int) $existing['board_id'], $timestamp);

        respond(200, ['deleted' => true, 'id' => $noteId]);
    }

    respond(404, ['error' => 'Unknown endpoint.']);
} catch (Throwable $exception) {
    respond(500, ['error' => $exception->getMessage()]);
}
