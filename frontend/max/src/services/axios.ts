import axios from "axios";

const instance = axios.create({ baseURL: process.env.BACKEND_DIR });

export default instance;
