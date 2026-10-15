export const clearSessionLogoutArtifacts = (): void => {
  ['token', 'expireTime'].forEach((key) => {
    sessionStorage.removeItem(key);
  });
  localStorage.removeItem('expireTime');
};
