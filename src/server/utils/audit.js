import { db } from './db'
import { roleLabel } from './session'

/**
 * 写操作日志：所有写接口在成功后调用，日志只增不改不删。
 * 传进来的 actor 是 requirePerm() 的返回值（当前登录用户）。
 */
export function writeLog(actor, { action, targetType, targetId, targetName, detail }) {
  return db.appendLog({
    actorId: actor.id,
    actorName: actor.name,
    actorRole: `${actor.roleLevel} 级 · ${roleLabel(actor.roleLevel)}`,
    action,
    targetType,
    targetId,
    targetName,
    detail,
  })
}
