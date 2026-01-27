
-- English House Academy CRM - Database Schema

-- 1. Users Table (For Staff & Admins)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('SUPER_ADMIN', 'EXECUTIVE', 'VIEW_ONLY') NOT NULL,
    isActive TINYINT(1) DEFAULT 1
);

-- 2. Batches Table
CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    maxSeats INT NOT NULL DEFAULT 60,
    createdAt BIGINT NOT NULL
);

-- 3. Candidates Table (Admission Records)
CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(50) PRIMARY KEY,
    batchId VARCHAR(50),
    executiveId VARCHAR(50),
    status ENUM('CONFIRMED', 'DEFERRED', 'CANCELLED') DEFAULT 'CONFIRMED',
    paymentStatus ENUM('ADVANCE_PAID', 'FULLY_PAID', 'DEFERRED', 'CANCELLED') DEFAULT 'ADVANCE_PAID',
    personalDetails JSON NOT NULL,
    contactDetails JSON NOT NULL,
    addressDetails JSON NOT NULL,
    travelDetails JSON NOT NULL,
    paymentHistory JSON NOT NULL,
    notes TEXT,
    createdAt BIGINT NOT NULL,
    updatedAt BIGINT NOT NULL,
    FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE SET NULL,
    FOREIGN KEY (executiveId) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Initial Data (Default Admin Account)
-- IMPORTANT: Use these credentials for your first login:
-- Username: admin
-- Password: admin123
INSERT IGNORE INTO users (id, username, password, name, role, isActive) 
VALUES ('admin-01', 'admin', 'admin123', 'System Administrator', 'SUPER_ADMIN', 1);

-- Default Batches
INSERT IGNORE INTO batches (id, name, maxSeats, createdAt) 
VALUES ('batch-may-2026', 'May 2026 Regular', 60, 1714545000000);

INSERT IGNORE INTO batches (id, name, maxSeats, createdAt) 
VALUES ('batch-june-2026', 'June 2026 Regular', 60, 1714545000000);
