CREATE TABLE `dict` (
  `id` bigint NOT NULL COMMENT '主键ID',
  `update_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `create_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `version` int DEFAULT '0' COMMENT '版本号',
  `type` varchar(32) NOT NULL COMMENT '类型',
  `name` varchar(32) NOT NULL COMMENT '名称',
  `code` varchar(64) DEFAULT NULL COMMENT '编码',
  `parent_dict_id` varchar(32) DEFAULT NULL COMMENT '父主键ID',
  `page_code` varchar(64) DEFAULT NULL COMMENT '页面编码',
  `delete_flag` tinyint(1) DEFAULT '0' COMMENT '删除标志位',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;