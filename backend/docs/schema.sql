-- Generated from app/models.py (the models are the source of truth).
-- Needs: CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE counties (
	id SERIAL NOT NULL,
	name VARCHAR(120) NOT NULL,
	code VARCHAR(20) NOT NULL,
	boundary geography(GEOMETRY,4326),
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	UNIQUE (name),
	UNIQUE (code)
);
CREATE INDEX idx_counties_boundary ON counties USING gist (boundary);

CREATE TABLE departments (
	id SERIAL NOT NULL,
	county_id INTEGER NOT NULL,
	name VARCHAR(120) NOT NULL,
	code VARCHAR(60),
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_department_county_name UNIQUE (county_id, name),
	CONSTRAINT uq_department_county_code UNIQUE (county_id, code),
	FOREIGN KEY(county_id) REFERENCES counties (id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX uq_department_county_name_ci
	ON departments (county_id, lower(name));
CREATE INDEX ix_departments_county ON departments (county_id, name);

CREATE TABLE areas (
	id SERIAL NOT NULL, 
	name VARCHAR(120) NOT NULL, 
	boundary geography(POLYGON,4326), 
	county_id INTEGER,
	PRIMARY KEY (id), 
	UNIQUE (name),
	FOREIGN KEY(county_id) REFERENCES counties (id) ON DELETE SET NULL
);
CREATE INDEX idx_areas_boundary ON areas USING gist (boundary);
CREATE INDEX ix_areas_county ON areas (county_id);

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
	county_id INTEGER,
	department_id INTEGER,
	onboarding_completed BOOLEAN NOT NULL,
	product_tour_enabled BOOLEAN NOT NULL,
	feature_tips_enabled BOOLEAN NOT NULL,
	onboarding_completed_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_users_role CHECK (role IN ('resident', 'verifier', 'authority', 'admin')), 
	UNIQUE (email), 
	FOREIGN KEY(area_id) REFERENCES areas (id) ON DELETE SET NULL,
	FOREIGN KEY(county_id) REFERENCES counties (id) ON DELETE SET NULL,
	FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL
);
CREATE INDEX ix_users_county ON users (county_id);
CREATE INDEX ix_users_department ON users (department_id);

CREATE TABLE reports (
	id SERIAL NOT NULL, 
	category_id INTEGER NOT NULL, 
	description VARCHAR(500), 
	address VARCHAR(255),
	landmark VARCHAR(120),
	status VARCHAR(20) NOT NULL, 
	location geography(POINT,4326) NOT NULL, 
	area_id INTEGER, 
	county_id INTEGER,
	department_id INTEGER,
	photo_path VARCHAR(255) NOT NULL, 
	created_by INTEGER NOT NULL, 
	assigned_to INTEGER, 
	due_date DATE, 
	duplicate_of INTEGER, 
	duplicate_score FLOAT, 
	report_count INTEGER NOT NULL, 
	ai_category_id INTEGER, 
	ai_class_name VARCHAR(100),
	ai_confidence FLOAT, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT ck_reports_status CHECK (status IN ('reported', 'verified', 'rejected', 'assigned', 'in_progress', 'resolved')), 
	FOREIGN KEY(category_id) REFERENCES categories (id), 
	FOREIGN KEY(area_id) REFERENCES areas (id) ON DELETE SET NULL, 
	FOREIGN KEY(county_id) REFERENCES counties (id) ON DELETE SET NULL,
	FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL,
	FOREIGN KEY(created_by) REFERENCES users (id), 
	FOREIGN KEY(assigned_to) REFERENCES users (id), 
	FOREIGN KEY(duplicate_of) REFERENCES reports (id) ON DELETE SET NULL, 
	FOREIGN KEY(ai_category_id) REFERENCES categories (id)
);
CREATE INDEX idx_reports_location ON reports USING gist (location);
CREATE INDEX ix_reports_category ON reports (category_id);
CREATE INDEX ix_reports_duplicate_of ON reports (duplicate_of);
CREATE INDEX ix_reports_status_created ON reports (status, created_at);
CREATE INDEX ix_reports_county_status ON reports (county_id, status, created_at);
CREATE INDEX ix_reports_department ON reports (department_id);

CREATE TABLE classification_feedback (
	id SERIAL NOT NULL,
	report_id INTEGER NOT NULL,
	image_path VARCHAR(255) NOT NULL,
	predicted_class VARCHAR(100) NOT NULL,
	predicted_category_id INTEGER,
	confidence FLOAT NOT NULL,
	selected_category_id INTEGER NOT NULL,
	accepted BOOLEAN NOT NULL,
	submitted_by INTEGER,
	review_status VARCHAR(20) NOT NULL,
	training_eligible BOOLEAN NOT NULL,
	reviewed_by INTEGER,
	reviewed_at TIMESTAMP WITH TIME ZONE,
	created_at TIMESTAMP WITH TIME ZONE NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT uq_classification_feedback_report UNIQUE (report_id),
	CONSTRAINT ck_classification_feedback_review_status CHECK (
		review_status IN ('pending', 'approved', 'rejected')
	),
	CONSTRAINT ck_classification_feedback_confidence CHECK (
		confidence >= 0 AND confidence <= 1
	),
	CONSTRAINT ck_classification_feedback_training_approval CHECK (
		NOT training_eligible OR review_status = 'approved'
	),
	CONSTRAINT ck_classification_feedback_accepted_category CHECK (
		NOT accepted OR (
			predicted_category_id IS NOT NULL AND
			selected_category_id = predicted_category_id
		)
	),
	FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE,
	FOREIGN KEY(predicted_category_id) REFERENCES categories (id),
	FOREIGN KEY(selected_category_id) REFERENCES categories (id),
	FOREIGN KEY(submitted_by) REFERENCES users (id) ON DELETE SET NULL,
	FOREIGN KEY(reviewed_by) REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX ix_classification_feedback_review
	ON classification_feedback (review_status, created_at);
CREATE INDEX ix_classification_feedback_training
	ON classification_feedback (training_eligible, review_status);

CREATE TABLE duplicate_suggestions (
	id SERIAL NOT NULL, 
	report_id INTEGER NOT NULL, 
	candidate_id INTEGER NOT NULL, 
	score FLOAT NOT NULL, 
	reasons JSON, 
	created_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	CONSTRAINT uq_duplicate_suggestion UNIQUE (report_id, candidate_id), 
	CONSTRAINT ck_duplicate_score CHECK (score >= 0 AND score <= 1), 
	FOREIGN KEY(report_id) REFERENCES reports (id) ON DELETE CASCADE, 
	FOREIGN KEY(candidate_id) REFERENCES reports (id) ON DELETE CASCADE
);
CREATE INDEX ix_duplicate_suggestions_report ON duplicate_suggestions (report_id, score);

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