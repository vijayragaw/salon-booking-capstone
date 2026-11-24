FROM node:22-bookworm-slim
WORKDIR /app
COPY --chown=node:node backend/booking.mjs backend/local.mjs ./backend/
COPY --chown=node:node public ./public
ENV HOST=0.0.0.0
USER node
EXPOSE 3000
CMD ["node", "backend/local.mjs"]
