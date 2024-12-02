import { useEffect, useState } from "react";
import io from "socket.io-client";

const useSocket = (userId) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000", {
      auth: { userId },
    });
    setSocket(newSocket);

    return () => {
      newSocket.disconnect(); // Disconnect socket on component unmount
    };
  }, [userId]);

  return socket;
};

export default useSocket;
