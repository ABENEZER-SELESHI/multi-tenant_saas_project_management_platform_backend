import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { commentService } from '../services/comment.service';
import {
  CreateCommentInput,
  ListCommentsQuery,
  UpdateCommentInput,
} from '../validators/comment.validator';

export class CommentController {
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await commentService.list(req.organizationId!, req.query as unknown as ListCommentsQuery);
      sendSuccess(res, result.items, 'Comments retrieved', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comment = await commentService.getById(req.organizationId!, req.params.commentId);
      sendSuccess(res, comment);
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comment = await commentService.create(
        req.organizationId!,
        req.userId!,
        req.body as CreateCommentInput,
      );
      sendSuccess(res, comment, 'Comment created', 201);
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const comment = await commentService.update(
        req.organizationId!,
        req.params.commentId,
        req.userId!,
        req.body as UpdateCommentInput,
      );
      sendSuccess(res, comment, 'Comment updated');
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await commentService.delete(req.organizationId!, req.params.commentId, req.userId!);
      sendSuccess(res, null, 'Comment deleted');
    } catch (err) {
      next(err);
    }
  };
}

export const commentController = new CommentController();
