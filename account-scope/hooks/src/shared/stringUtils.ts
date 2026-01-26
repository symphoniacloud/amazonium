export function kebabCaseToPascalCase(stackName: string) {
  return stackName
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}
