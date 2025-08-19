--
-- PostgreSQL database dump
--

\restrict MBnqpoz0hTBg7ZGfSvt8j3T4NNbE1dTHgAHbMQ5lG6Ay7ch8ruOSDJnRblH6ncZ

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'ede806b1-c30a-4c5a-828c-266a2b3a97f0', 'authenticated', 'authenticated', 'ben@scanwise.com', '$2a$10$Xt3nPzsciHS.3PvHDm9E5OhGDX3ofO6viDLQWqb0wZTTOzsb/4VxO', '2025-07-17 09:25:01.526002+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-09 03:48:38.226774+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-07-17 09:25:01.507827+00', '2025-08-09 06:57:28.937336+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);
INSERT INTO auth.users VALUES ('00000000-0000-0000-0000-000000000000', 'c8e6cc50-576d-4d4d-bd88-18d5ebc20280', 'authenticated', 'authenticated', 'test@example.com', '$2a$10$V9mUeE8mrjD25Mnf5T./wet5h6r1oBwTK54mEDyZkNxjEgWfaJ9UO', '2025-06-30 13:49:59.156443+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-18 06:04:56.305494+00', '{"provider": "email", "providers": ["email"]}', '{"email_verified": true}', NULL, '2025-06-30 13:49:59.134513+00', '2025-08-18 09:03:08.792879+00', NULL, NULL, '', '', NULL, DEFAULT, '', 0, NULL, '', NULL, false, NULL, false);


--
-- PostgreSQL database dump complete
--

\unrestrict MBnqpoz0hTBg7ZGfSvt8j3T4NNbE1dTHgAHbMQ5lG6Ay7ch8ruOSDJnRblH6ncZ

