<?php
/**
 * Hostinger MySQL Backend API for English House Academy CRM
 * Configure your DB details below.
 */

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// --- DATABASE CONFIGURATION ---
$db_host = "localhost"; 
$db_name = "YOUR_DB_NAME";      // e.g. u123456789_crm
$db_user = "YOUR_DB_USER";      // e.g. u123456789_admin
$db_pass = "YOUR_DB_PASSWORD";
// ------------------------------

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
}

$method = $_SERVER['REQUEST_METHOD'];
$request = explode('/', trim($_SERVER['PATH_INFO'] ?? '', '/'));
$input = json_decode(file_get_contents('php://input'), true);

$action = $input['action'] ?? $_GET['action'] ?? '';

switch ($action) {
    case 'login':
        $username = $input['username'] ?? '';
        $password = $input['password'] ?? '';
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? AND isActive = 1");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // In production, use password_verify(). For this migration, we check plain text.
        if ($user && $user['password'] === $password) {
            unset($user['password']); // Don't send password back
            echo json_encode(["status" => "success", "user" => $user]);
        } else {
            http_response_code(401);
            echo json_encode(["error" => "Invalid credentials"]);
        }
        break;

    case 'get_candidates':
        $stmt = $pdo->prepare("SELECT * FROM candidates ORDER BY createdAt DESC");
        $stmt->execute();
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        foreach($results as &$row) {
            $row['personalDetails'] = json_decode($row['personalDetails'], true);
            $row['contactDetails'] = json_decode($row['contactDetails'], true);
            $row['addressDetails'] = json_decode($row['addressDetails'], true);
            $row['travelDetails'] = json_decode($row['travelDetails'], true);
            $row['paymentHistory'] = json_decode($row['paymentHistory'], true);
        }
        echo json_encode($results);
        break;

    case 'save_candidate':
        $data = $input['candidate'];
        $stmt = $pdo->prepare("INSERT INTO candidates (id, batchId, executiveId, status, paymentStatus, personalDetails, contactDetails, addressDetails, travelDetails, paymentHistory, createdAt, updatedAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            batchId=VALUES(batchId), status=VALUES(status), paymentStatus=VALUES(paymentStatus), 
            personalDetails=VALUES(personalDetails), contactDetails=VALUES(contactDetails), 
            addressDetails=VALUES(addressDetails), travelDetails=VALUES(travelDetails), 
            paymentHistory=VALUES(paymentHistory), updatedAt=VALUES(updatedAt)");
        
        $stmt->execute([
            $data['id'], $data['batchId'], $data['executiveId'], $data['status'], $data['paymentStatus'],
            json_encode($data['personalDetails']), json_encode($data['contactDetails']),
            json_encode($data['addressDetails']), json_encode($data['travelDetails']),
            json_encode($data['paymentHistory']), $data['createdAt'] ?? time()*1000, time()*1000
        ]);
        echo json_encode(["status" => "success"]);
        break;

    case 'get_batches':
        $stmt = $pdo->prepare("SELECT * FROM batches");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'save_batch':
        $data = $input['batch'];
        $stmt = $pdo->prepare("REPLACE INTO batches (id, name, maxSeats, createdAt) VALUES (?, ?, ?, ?)");
        $stmt->execute([$data['id'], $data['name'], $data['maxSeats'], $data['createdAt']]);
        echo json_encode(["status" => "success"]);
        break;

    case 'get_users':
        $stmt = $pdo->prepare("SELECT id, username, name, role, isActive FROM users");
        $stmt->execute();
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    case 'save_user':
        $data = $input['user'];
        $pass = $input['password'] ?? null;
        if ($pass) {
            $stmt = $pdo->prepare("REPLACE INTO users (id, username, name, role, isActive, password) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$data['id'], $data['username'], $data['name'], $data['role'], $data['isActive'] ? 1 : 0, $pass]);
        } else {
            $stmt = $pdo->prepare("UPDATE users SET name=?, role=?, isActive=? WHERE id=?");
            $stmt->execute([$data['name'], $data['role'], $data['isActive'] ? 1 : 0, $data['id']]);
        }
        echo json_encode(["status" => "success"]);
        break;

    default:
        echo json_encode(["error" => "Invalid action"]);
        break;
}
?>