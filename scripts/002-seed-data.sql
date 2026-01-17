-- Seed members
INSERT INTO members (email, first_name, last_name, phone, status, role) VALUES
('john.doe@example.com', 'John', 'Doe', '+1-555-0101', 'active', 'admin'),
('jane.smith@example.com', 'Jane', 'Smith', '+1-555-0102', 'active', 'member'),
('mike.johnson@example.com', 'Mike', 'Johnson', '+1-555-0103', 'active', 'member'),
('sarah.wilson@example.com', 'Sarah', 'Wilson', '+1-555-0104', 'pending', 'member'),
('david.brown@example.com', 'David', 'Brown', '+1-555-0105', 'inactive', 'member'),
('emily.davis@example.com', 'Emily', 'Davis', '+1-555-0106', 'active', 'moderator'),
('chris.miller@example.com', 'Chris', 'Miller', '+1-555-0107', 'active', 'member'),
('lisa.anderson@example.com', 'Lisa', 'Anderson', '+1-555-0108', 'active', 'member');

-- Seed events
INSERT INTO events (title, description, location, start_date, end_date, capacity, status) VALUES
('Annual Tech Conference', 'Join us for our biggest tech event of the year featuring industry leaders and workshops.', 'Convention Center, Main Hall', NOW() + INTERVAL '30 days', NOW() + INTERVAL '32 days', 500, 'upcoming'),
('Community Meetup', 'Monthly community gathering to network and share ideas.', 'Community Center Room A', NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days' + INTERVAL '3 hours', 50, 'upcoming'),
('Workshop: Web Development', 'Hands-on workshop covering modern web development practices.', 'Tech Hub Building B', NOW() + INTERVAL '14 days', NOW() + INTERVAL '14 days' + INTERVAL '6 hours', 30, 'upcoming'),
('Networking Dinner', 'Exclusive dinner event for premium members.', 'Grand Restaurant', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '4 hours', 40, 'completed'),
('Product Launch Event', 'Be the first to see our new product lineup.', 'Innovation Center', NOW() + INTERVAL '45 days', NOW() + INTERVAL '45 days' + INTERVAL '5 hours', 200, 'upcoming');

-- Seed newsletters
INSERT INTO newsletters (subject, content, status, scheduled_at, sent_at, recipient_count, open_rate) VALUES
('Welcome to Our Community!', 'Thank you for joining our community. Here''s what you can expect...', 'sent', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', 156, 68.50),
('January Newsletter', 'Happy New Year! Here are the highlights from this month...', 'sent', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', 189, 72.30),
('Upcoming Events Announcement', 'Don''t miss these exciting upcoming events in our community...', 'scheduled', NOW() + INTERVAL '2 days', NULL, 0, NULL),
('Member Spotlight: February', 'This month we highlight the achievements of our outstanding members...', 'draft', NULL, NULL, 0, NULL);
