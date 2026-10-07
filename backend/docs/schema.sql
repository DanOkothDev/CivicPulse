-- Generated from app/models.py (the models are the source of truth).
-- Needs: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE areas (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	boundary geography(POLYGON,4326), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);
CREATE INDEX idx_areas_boundary ON areas USING gist (boundary);

CREATE TABLE categories (
	id SERIAL NOT NULL, 
	name VARCHAR(60) NOT NULL, 
	icon VARCHAR(40), 
	PRIMARY KEY (id), 
	UNIQUE (name)
);

CREATE TABLE hotspots (
	id SERIAL NOT NULL, 
	center geography(POINT,4326) NOT NULL, 
	radius_m FLOAT NOT NULL, 
	report_count INTEGER NOT NULL, 
	top_category_id INTEGER, 
	computed_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(top_category_id) REFERENCES categories (id)
);
CREATE INDEX idx_hotspots_center ON hotspots USING gist (center);

CREATE TABLE users (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	role VARCHAR(20) NOT NULL, 
	area_id INTEGER, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_users_role CHECK (role IN ('resident', 'verifier', 'authority', 'admin')), 
	UNIQUE (email), 
	FOREIGN KEY(area_id) REFERENCES areas (id) ON DELETE SET NULL
);

CREATE TABLE reports (
	id SERIAL NOT NULL, 
	category_id INTEGER NOT NULL, 
	description VARCHAR(500), 
	status VARCHAR(20) NOT NULL, 
	location geography(POINT,4326) NOT NULL, 
	area_id INTEGER, 
	photo_path VARCHAR(255) NOT NULL, 
	created_by INTEGER NOT NULL, 
	assigned_to INTEGER, 
	due_date DATE, 
	duplicate_of INTEGER, 
	duplicate_score FLOAT, 
	report_count INTEGER NOT NULL, 
	ai_category_id INTEGER, 
	ai_confidence FLOAT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_reports_status CHECK (status IN ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')), 
	FOREIGN KEY(category_id) REFERENCES categories (id), 
	FOREIGN KEY(area_id) REFERENCES areas (id) ON DELETE SET NULL, 
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(duplicate_of) REFERENCES reports (id) ON DELETE SET NULL, 
	FOREIGN KEY(ai_category_id) REFERENCES categories (id)
);
CREATE INDEX idx_reports_location ON reports USING gist (location);
CREATE INDEX ix_reports_category ON reports (category_id);
CREATE INDEX ix_reports_duplicate_of ON reports (duplicate_of);
CREATE INDEX ix_reports_status_created ON reports (status, created_at);

CREATE TABLE follows (
	user_id INTEGER NOT NULL, 
	report_id INTEGER NOT NULL, 
	PRIMARY KEY (user_id, report_id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE
);

CREATE TABLE notifications (
	id SERIAL NOT NULL, 
	user_id INTEGER NOT NULL, 
	report_id INTEGER NOT NULL, 
	message VARCHAR(255) NOT NULL, 
	read BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
	FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE
);
CREATE INDEX ix_notifications_user ON notifications (user_id, read, created_at);

CREATE TABLE status_events (
	id SERIAL NOT NULL, 
	report_id INTEGER NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	changed_by INTEGER NOT NULL, 
	note VARCHAR(500), 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_status_events_status CHECK (status IN ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')), 
	FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id)
);
CREATE INDEX ix_status_events_report ON status_events (report_id, created_at);
