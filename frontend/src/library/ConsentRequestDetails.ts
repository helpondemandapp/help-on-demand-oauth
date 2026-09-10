export type ConsentRequestDetails = {
  scopes: { scope: string; description: string }[];
  client: {
    name: string;
  };
  user: {
    email: string;
    firstName: string;
    lastName: string;
  };
};
