import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import { prisma } from '../config/prisma';

export class ContactController {
  
  getContacts = async (req: AuthRequest, res: Response) => {
    try {
      const contacts = await prisma.contact.findMany({
        where: { userId: req.userId },
        include: {
          contact: {
            select: {
              id: true,
              username: true,
              fullName: true,
              avatarUrl: true,
              status: true,
              lastSeen: true
            }
          }
        }
      });
      res.status(200).json(contacts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  addContact = async (req: AuthRequest, res: Response) => {
    try {
      const { contactId, alias } = req.body;
      
      if (req.userId === contactId) {
        return res.status(400).json({ error: "You cannot add yourself as a contact" });
      }

      const existing = await prisma.contact.findUnique({
        where: { userId_contactId: { userId: req.userId!, contactId } }
      });

      if (existing) {
        return res.status(400).json({ error: "Contact already exists" });
      }

      const contact = await prisma.contact.create({
        data: {
          userId: req.userId!,
          contactId,
          alias
        },
        include: {
          contact: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              status: true
            }
          }
        }
      });

      res.status(201).json(contact);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  removeContact = async (req: AuthRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      await prisma.contact.delete({
        where: { id }
      });
      res.status(200).json({ message: "Contact removed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
