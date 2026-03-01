import bcrypt from "bcrypt";
import { HASH_LENGTH } from "../const";

export const hashString = async (plainString: string): Promise<string> => {
  const hashedString = await bcrypt.hash(plainString, HASH_LENGTH);
  return hashedString;
};

export const compareString = async (givenString: string, correctString: string,): Promise<boolean> => {
  const isStringCorrect = await bcrypt.compare(givenString, correctString);
  return isStringCorrect;
};


