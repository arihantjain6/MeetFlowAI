"use client";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function Home() {
  const { data: session, } = authClient.useSession()

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = () => {
    authClient.signUp.email({
      email,
      name,
      password,
    }, {
      onSuccess: () => {
        window.alert("Success")
      },
      onError: () => {
        window.alert("Something went wrong")
      }
    });
  };

  const onLogin = () => {
    authClient.signIn.email({
      email,
      password,
    }, {
      onSuccess: () => {
        window.alert("Success")
      },
      onError: () => {
        window.alert("Something went wrong")
      }
    });
  };

  if (session) {
    return (
      <div className="flex flex-col p-4 gap-y-4">
        <p>Logged in as {session.user.name}</p>
        <Button onClick={() => authClient.signOut()}>Sign Out</Button>
      </div>
    )
  }


  return (
    <div className="flex flex-col gap-y-10">
      <div className="flex flex-col p-4 gap-y-4">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
        <Button onClick={onSubmit}>Create User</Button>
      </div>

      <div className="flex flex-col p-4 gap-y-4">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
        />
        <Button onClick={onLogin}>Login</Button>
      </div>
    </div>
  );
}
