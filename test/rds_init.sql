CREATE TABLE IF NOT EXISTS `ali-sdk-test-user` (
 `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT COMMENT 'primary key',
 `gmt_create` datetime NOT NULL COMMENT 'create time' DEFAULT NOW(),
 `gmt_modified` datetime NOT NULL COMMENT 'modified time' DEFAULT NOW(),
 `name` varchar(100) NOT NULL COMMENT 'user name',
 `email` varchar(400) NOT NULL,
 `mobile` varchar(50) DEFAULT NULL,
 PRIMARY KEY (`id`),
 UNIQUE KEY `name` (`name`),
 KEY `gmt_modified` (`gmt_modified`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='user base info';
