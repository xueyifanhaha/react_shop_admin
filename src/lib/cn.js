/** 拼接 className：过滤假值，条件类不再手写模板串 */
export const cn = (...args) => args.filter(Boolean).join(' ')
