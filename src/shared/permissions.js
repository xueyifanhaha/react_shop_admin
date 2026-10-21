/**
 * 权限点与角色的唯一定义处。
 * app/ 与 server/ 都从这里引（Nuxt 4 的 #shared 别名），改一处两边同时生效。
 */

export const PERM = {
  PRODUCT_VIEW: 'product:view',
  PRODUCT_EDIT: 'product:edit',
  PRODUCT_STATUS: 'product:status',
  CATEGORY_VIEW: 'category:view',
  CATEGORY_EDIT: 'category:edit',
  LOG_VIEW: 'log:view',
  ROLE_MANAGE: 'role:manage',
}

export const ALL_PERMISSIONS = Object.values(PERM)

/** 种子角色：1 级固定拥有全部权限，2/3 级后续可在权限管理页调整 */
export const ROLE_PRESETS = [
  {
    level: 1,
    key: 'admin',
    label: '管理员',
    description: '全部功能，包含权限管理',
    permissions: [...ALL_PERMISSIONS],
  },
  {
    level: 2,
    key: 'editor',
    label: '运营',
    description: '可维护商品与分类，看不到操作日志',
    permissions: [
      PERM.PRODUCT_VIEW,
      PERM.PRODUCT_EDIT,
      PERM.PRODUCT_STATUS,
      PERM.CATEGORY_VIEW,
      PERM.CATEGORY_EDIT,
    ],
  },
  {
    level: 3,
    key: 'viewer',
    label: '只读',
    description: '只能查看，没有编辑入口',
    permissions: [PERM.PRODUCT_VIEW, PERM.CATEGORY_VIEW],
  },
]

/** 侧边栏菜单：按权限过滤后渲染，所以 2/3 级看不到日志与权限管理 */
export const ADMIN_NAV = [
  { to: '/products', label: '商品管理', icon: 'goods', permission: PERM.PRODUCT_VIEW },
  { to: '/categories', label: '分类管理', icon: 'tag', permission: PERM.CATEGORY_VIEW },
  { to: '/logs', label: '操作日志', icon: 'log', permission: PERM.LOG_VIEW },
  { to: '/roles', label: '权限管理', icon: 'shield', permission: PERM.ROLE_MANAGE },
]

/** 权限管理页用的分组展示 */
export const PERMISSION_GROUPS = [
  {
    group: '商品',
    items: [
      { perm: PERM.PRODUCT_VIEW, label: '查看商品' },
      { perm: PERM.PRODUCT_EDIT, label: '编辑商品' },
      { perm: PERM.PRODUCT_STATUS, label: '上下架' },
    ],
  },
  {
    group: '分类',
    items: [
      { perm: PERM.CATEGORY_VIEW, label: '查看分类' },
      { perm: PERM.CATEGORY_EDIT, label: '编辑分类' },
    ],
  },
  {
    group: '系统',
    items: [
      { perm: PERM.LOG_VIEW, label: '查看操作日志' },
      { perm: PERM.ROLE_MANAGE, label: '权限管理' },
    ],
  },
]
