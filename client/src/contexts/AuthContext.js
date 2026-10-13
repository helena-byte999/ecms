import React, { useState, useEffect, createContext, useContext } from "react";
import { authenticate } from "../data/api";
import Axios from "axios";
import Loader from "components/Loader.js";

import { Redirect } from "react-router-dom";

const AuthContext = createContext();
Axios.defaults.withCredentials = true;

export const useAuth = () => useContext(AuthContext);

function AuthContextProvider(props) {
  const [loggedIn, setLoggedIn] = useState(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [userDetail, setUserDetail] = useState({});

  async function getLoggedIn() {
    Axios.defaults.headers.common["Authorization"] =
      localStorage.getItem("token");
    const loggedInRes = await Axios.get(authenticate.loggedIn);
    if (loggedInRes.data.status === false) {
      window.localStorage.removeItem("token");
      setLoggedIn(false);
      setUserDetail({});
      <Redirect to="/login" />;
    } else {
      const user = await Axios.get(authenticate.getUserData);
      setLoggedIn(loggedInRes.data);
      setUserDetail(user.data);
      return user.data;
    }
  }
  useEffect(() => {
    const token = localStorage.getItem("token");
    // Logged-out visitors don't need the server to see public pages, so don't
    // make them wait for it (free hosting can take ~a minute to wake up).
    // Ping it anyway so it's awake by the time they sign in.
    if (!token) {
      Axios.get(authenticate.loggedIn).catch(() => {});
      setLoggedIn(false);
      setIsLoading(false);
      return;
    }
    Axios.defaults.headers.common["Authorization"] = token;
    Axios.get(authenticate.loggedIn)
      .then((response) => {
        if (response.data === false || response.data.status === false) {
          window.localStorage.removeItem("token");
          setLoggedIn(false);
        } else {
          // wait for the user's role before rendering routes, otherwise a refresh redirects to the homepage
          return Axios.get(authenticate.getUserData).then((user) => {
            setLoggedIn(response.data);
            setUserDetail(user.data);
          });
        }
      })
      .catch(() => setLoggedIn(false))
      .finally(() => setIsLoading(false));
  }, []);
  if (isLoading) {
    return (
      <Loader note="Connecting to the server. If it has been idle, this can take up to a minute." />
    );
  }
  return (
    <AuthContext.Provider
      value={{ loggedIn, getLoggedIn, userDetail, setUserDetail }}
    >
      {props.children}
    </AuthContext.Provider>
  );
}

export default AuthContextProvider;
