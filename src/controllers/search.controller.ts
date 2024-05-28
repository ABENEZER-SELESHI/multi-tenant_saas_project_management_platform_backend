import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { searchService } from '../services/search.service';
import { SearchQuery } from '../validators/search.validator';

export class SearchController {
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await searchService.search(req.organizationId!, req.query as unknown as SearchQuery);
      sendSuccess(res, result.results, 'Search completed', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };
}

export const searchController = new SearchController();
