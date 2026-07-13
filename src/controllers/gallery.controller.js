import {
  getMyCardsService,
  postMyCardsService,
  getMyTradesService,
  getMyCardCreateStatusService,
} from '../services/gallery.service.js';
import AppError from '../utils/AppError.js';
import cloudinary from '../configs/cloudinary.js';

export const getMyCards = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const {
      keyword,
      grade,
      type,
      page = 1,
      limit = 15,
      sort = 'latest',
    } = req.query;

    const result = await getMyCardsService({
      userId,
      keyword,
      grade,
      type,
      page: Number(page),
      limit: Math.min(Number(limit), 50),
      sort,
    });

    return res.status(200).json({
      data: result,
      message: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const postMyCards = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      throw new AppError(400, 'FILE_REQUIRED', '파일을 등록해 주세요.');
    }

    const { name, description, grade, type, initialPrice, totalQuantity } =
      req.body;

    const uploadResult = await cloudinary.uploader.upload(
      `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`
    );

    const imageUrl = uploadResult.secure_url;

    const result = await postMyCardsService({
      userId,
      name,
      description,
      imageUrl,
      grade,
      type,
      initialPrice: Number(initialPrice),
      totalQuantity: Number(totalQuantity),
    });

    return res.status(201).json({
      data: result,
      message: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTrades = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const {
      keyword,
      grade,
      type,
      tradeType,
      isSoldOut,
      page = 1,
      limit = 15,
      sort = 'latest',
    } = req.query;

    const result = await getMyTradesService({
      userId,
      keyword: keyword || undefined,
      grade: grade || undefined,
      type: type || undefined,
      tradeType: tradeType || undefined,
      isSoldOut: isSoldOut || undefined,
      page: Number(page),
      limit: Math.min(Number(limit), 50),
      sort,
    });

    return res.status(200).json({
      data: result,
      message: 'success',
    });
  } catch (error) {
    next(error);
  }
};

export const getMyCardCreateStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await getMyCardCreateStatusService({ userId });

    return res.status(200).json({
      data: result,
      message: 'success',
    });
  } catch (error) {
    next(error);
  }
};
