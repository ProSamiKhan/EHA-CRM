-- Database Schema for EHA CRM

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL,
    isActive TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS batches (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    maxSeats INT NOT NULL,
    createdAt BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
    id VARCHAR(50) PRIMARY KEY,
    batchId VARCHAR(50),
    executiveId VARCHAR(50),
    status VARCHAR(20),
    paymentStatus VARCHAR(20),
    personalDetails JSON,
    contactDetails JSON,
    addressDetails JSON,
    travelDetails JSON,
    paymentHistory JSON,
    createdAt BIGINT,
    updatedAt BIGINT,
    FOREIGN KEY (batchId) REFERENCES batches(id)
);

-- Seed Initial Admin User
-- IMPORTANT: Change 'admin123' to a strong password after first login
INSERT IGNORE INTO users (id, username, password, name, role, isActive) 
VALUES ('admin-01', 'admin', 'admin123', 'Super Admin', 'SUPER_ADMIN', 1);

-- Seed Initial Batches
INSERT IGNORE INTO batches (id, name, maxSeats, createdAt) VALUES 
('batch-1', 'May 2026', 60, 1714545000000),
('batch-2', 'June 2026', 60, 1714545000000);
