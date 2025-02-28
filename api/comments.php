<?php
require_once 'db.php';

class CommentManager {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function addComment($userId, $articleId, $comment) {
        $stmt = $this->db->prepare(
            "INSERT INTO comments (user_id, article_id, content, created_at) 
             VALUES (?, ?, ?, NOW())"
        );
        return $stmt->execute([$userId, $articleId, $comment]);
    }
    
    public function getComments($articleId) {
        $stmt = $this->db->prepare(
            "SELECT c.*, u.username 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.article_id = ? 
             ORDER BY c.created_at DESC"
        );
        $stmt->execute([$articleId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    public function banUser($userId, $reason) {
        $stmt = $this->db->prepare(
            "INSERT INTO banned_users (user_id, reason, banned_at) 
             VALUES (?, ?, NOW())"
        );
        return $stmt->execute([$userId, $reason]);
    }
    
    public function isBanned($userId) {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) FROM banned_users WHERE user_id = ?"
        );
        $stmt->execute([$userId]);
        return $stmt->fetchColumn() > 0;
    }
}

// Handle API requests
$commentManager = new CommentManager($db);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($commentManager->isBanned($data['userId'])) {
        http_response_code(403);
        echo json_encode(['error' => 'User is banned']);
        exit;
    }
    
    if ($commentManager->addComment(
        $data['userId'],
        $data['articleId'],
        $data['comment']
    )) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add comment']);
    }
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $articleId = $_GET['articleId'] ?? null;
    if ($articleId) {
        $comments = $commentManager->getComments($articleId);
        echo json_encode($comments);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Article ID required']);
    }
}
?>