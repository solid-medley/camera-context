// Fix for css imports
declare module '*.css' {
  const content: string;
  export default content;
}