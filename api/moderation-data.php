<?php
require_once 'db.php';

class ModerationManager {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    public function getBannedWords() {
        $stmt = $this->db->query("SELECT word FROM banned_words");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    public function getBannedUsers() {
        $stmt = $this->db->query("SELECT user_id FROM banned_users");
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    public function getModerationData() {
        return [
            'bannedWords' => $this->getBannedWords(),
            'bannedUsers' => $this->getBannedUsers()
        ];
    }
}

// Handle API request
$moderationManager = new ModerationManager($db);
header('Content-Type: application/json');
echo json_encode($moderationManager->getModerationData());
?>

