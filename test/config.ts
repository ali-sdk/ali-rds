export default {
  host: process.env.TEST_ALI_RDS_HOST || '127.0.0.1',
  port: parseInt(process.env.TEST_ALI_RDS_PORT || '3306'),
  user: process.env.TEST_ALI_RDS_USER || 'root',
  password: process.env.TEST_ALI_RDS_PASSWORD || '',
  database: process.env.TEST_ALI_RDS_DATABASE || 'test',
};
