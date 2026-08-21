import { Evaluator } from './runtime';
export type OperatorArity = 1 | 2 | 3 | 'variadic';
export declare const getOperatorArity: (operator: string) => OperatorArity | undefined;
export declare const supportsSingleListArgument: (operator: string) => boolean;
export declare const compileOperator: (operator: string, args: Evaluator[]) => Evaluator;
