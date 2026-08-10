import { Hono } from 'hono';
import type { AuthEnv } from '../../middleware/auth';
import health from './health';
import auth from './auth';
import courses from './courses';
import workshops from './workshops';
import users from './users';
import modules from './modules';
import lessons from './lessons';
import quizzes from './quizzes';
import quizQuestions from './quiz-questions';
import enrollments from './enrollments';

const lms = new Hono<AuthEnv>();

lms.route('/health', health);
lms.route('/auth', auth);
lms.route('/courses', courses);
lms.route('/workshops', workshops);
lms.route('/users', users);
lms.route('/modules', modules);
lms.route('/lessons', lessons);
lms.route('/quizzes', quizzes);
lms.route('/quiz-questions', quizQuestions);
lms.route('/enrollments', enrollments);

export default lms;
