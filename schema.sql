CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role ENUM('user', 'admin') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE questions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    question_text TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,
    option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,
    option_d VARCHAR(500) NOT NULL,
    correct_answer CHAR(1) NOT NULL,
    category_id BIGINT NOT NULL,
    difficulty_level ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    created_by BIGINT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_questions_category_difficulty (category_id, difficulty_level)
);

CREATE TABLE user_progress (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    attempted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    INDEX idx_progress_user_category (user_id, attempted_at)
);

CREATE TABLE admin_links (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    link_url VARCHAR(500) NOT NULL UNIQUE,
    link_title VARCHAR(160) NOT NULL,
    page_location VARCHAR(80) NOT NULL,
    created_by BIGINT NOT NULL,
    expires_at TIMESTAMP NULL,
    usage_limit INT NULL,
    click_count INT NOT NULL DEFAULT 0,
    unique_visitors INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_admin_links_expiry (expires_at)
);

INSERT INTO categories (category_name) VALUES ('DSA'), ('Career Resources'), ('Aptitude');
