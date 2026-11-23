<?php

header('Content-Type: application/json');

require_once __DIR__ . '/../../config.php';

$data = json_decode(file_get_contents("php://input"), true);

$phone = trim($data['phone'] ?? '');
$otp = trim($data['otp'] ?? '');
$username = trim($data['username'] ?? '');

if ($phone !== ($_SESSION['otp_phone'] ?? '')) {
    http_response_code(400);
    echo json_encode([
        "error" => "Mobile number match नहीं है।"
    ]);
    exit;
}

if ($otp !== ($_SESSION['otp_code'] ?? '')) {
    http_response_code(400);
    echo json_encode([
        "error" => "OTP गलत है।"
    ]);
    exit;
}

if (
    empty($_SESSION['otp_time']) ||
    time() - $_SESSION['otp_time'] > 300
) {
    http_response_code(400);
    echo json_encode([
        "error" => "OTP expire हो गया है।"
    ]);
    exit;
}

$stmt = $pdo->prepare(
    "SELECT id, name, mobile, wallet, winning
     FROM users
     WHERE mobile = ?
     LIMIT 1"
);

$stmt->execute([$phone]);

$user = $stmt->fetch();

if (!$user) {

    $insert = $pdo->prepare(
        "INSERT INTO users
        (name, mobile, password)
        VALUES (?, ?, ?)"
    );

    $insert->execute([
        $username ?: "Player",
        $phone,
        password_hash(
            bin2hex(random_bytes(16)),
            PASSWORD_DEFAULT
        )
    ]);

    $userId = (int)$pdo->lastInsertId();

    $stmt->execute([$phone]);
    $user = $stmt->fetch();

} else {

    $userId = (int)$user['id'];
}

$_SESSION['user_id'] = $userId;

unset(
    $_SESSION['otp_phone'],
    $_SESSION['otp_code'],
    $_SESSION['otp_time'],
    $_SESSION['otp_username']
);

echo json_encode([
    "message" => "Login सफल हुआ।",
    "user" => [
        "id" => $userId,
        "name" => $user['name'] ?? $username,
        "mobile" => $user['mobile'] ?? $phone,
        "wallet" => $user['wallet'] ?? 0,
        "winning" => $user['winning'] ?? 0
    ]
]);

?>