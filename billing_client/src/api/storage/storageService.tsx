export class StorageService {
    TOKENKEY = 'token';

    public setToken(token: string) {
        if (!token) {
            return;
        }
        window.sessionStorage.setItem(this.TOKENKEY, token);
    }

    public getToken() {
        return window.sessionStorage.getItem(this.TOKENKEY);
    }

    public clearToken = () => {
        window.sessionStorage.removeItem(this.TOKENKEY);
    }
}
