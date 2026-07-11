export type EvalOperatorUser = {
  evalOperator?: boolean;
  isDemo?: boolean;
};

/**
 * Operator access is explicit and disabled by default.
 *
 * Demo accounts are intentionally excluded so the public/demo beta cannot
 * accidentally gain access to expensive or sensitive eval lab surfaces.
 */
export function hasEvalOperatorAccess(user: EvalOperatorUser | null): boolean {
  return user?.evalOperator === true && user.isDemo !== true;
}
