<?php
session_start();

header('Content-Type: application/json; charset=utf-8');

function reply($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$phone = trim($data['phone'] ?? '');
$username = trim($data['username'] ?? '');

if (!preg_match('/^[6-9][0-9]{9}$/', $phone)) {
    reply([
        "error" => "सही 10 अंकों का मोबाइल नंबर डालें।"
    ], 400);
}

$apiKey = trim((string) getenv('API_KING_API_KEY'));
if ($apiKey === '') {
    reply(["error" => "SMS API key configured nahi hai."], 503);
}

$otp = (string) random_int(1000, 9999);

$_SESSION['otp_phone'] = $phone;
$_SESSION['otp_code'] = $otp;
$_SESSION['otp_time'] = time();
$_SESSION['otp_username'] = $username;

$url = "https://api.api-king.com/api/v1/otp/send";

$payload = [
    "number" => $phone,
    "otp" => $otp,
    "flash" => 0
];

$ch = curl_init($url);

curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . $apiKey,
        "Content-Type: application/json",
        "Accept: application/json"
    ],
    CURLOPT_TIMEOUT => 30
]);

$response = curl_exec($ch);
$curlError = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close($ch);

if ($response === false) {
    reply([
        "error" => "OTP server connection failed: " . $curlError
    ], 500);
}

$result = json_decode($response, true);

if ($httpCode >= 200 && $httpCode < 300) {
    reply([
        "message" => "OTP आपके मोबाइल पर भेज दिया गया है।"
    ]);
}

/* API ने क्या जवाब दिया, वह भी JSON में दिखेगा */
reply([
    "error" => $result['message']
        ?? $result['error']
        ?? "API King OTP भेजने में असफल रहा।",
    "api_response" => $response,
    "http_code" => $httpCode
], 400);
?>