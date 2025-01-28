import React, { createContext, useState, useContext } from "react";

const TherapistsContext = createContext();

export const TherapistsProvider = ({ children }) => {
  const [therapists, setTherapists] = useState([]);
  const [hasFetchedTherapists, setHasFetchedTherapists] = useState(false);

  return (
    <TherapistsContext.Provider
      value={{ therapists, setTherapists, hasFetchedTherapists, setHasFetchedTherapists }}
    >
      {children}
    </TherapistsContext.Provider>
  );
};

export const useTherapists = () => useContext(TherapistsContext);
