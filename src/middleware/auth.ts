import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { errors } from "../constants/errors";

export const SECRET_KEY = "segredo_super_seguro_nao_usar_em_prod_pliz";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: errors.UNAUTHORIZED });
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ error: errors.UNAUTHORIZED });
    }
    req.user = user;
    next();
  });
};
