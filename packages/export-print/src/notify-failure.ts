import type { Environment } from '@inkdropapp/types'
import { logger } from 'inkdrop'

/**
 * Describes a thrown value for a notification's detail line.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Builds a rejection handler that logs the error and shows it to the user, so a
 * command that fails never ends in an unhandled rejection.
 */
export function notifyFailure(env: Environment, message: string) {
  return (error: unknown) => {
    logger.error(message, error)
    env.notifications.addError(message, {
      detail: errorMessage(error),
      dismissable: true
    })
  }
}
