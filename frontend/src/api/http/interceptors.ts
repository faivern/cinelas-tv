import { api } from "./axios";
import {
  isNetworkError,
  reportNetworkFailure,
  reportSuccess,
} from "../../lib/connection/serverStatus";

api.interceptors.response.use(
  (res) => {
    reportSuccess();
    return res;
  },
  (err) => {
    if (isNetworkError(err)) reportNetworkFailure();
    return Promise.reject(err);
  }
);
