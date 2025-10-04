export const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const makePossessive = (name: string) => {
  if (!name) return name;

  const lastChar = name.charAt(name.length - 1).toLowerCase();
  return lastChar === 's' ? `${name}'` : `${name}'s`;
};
