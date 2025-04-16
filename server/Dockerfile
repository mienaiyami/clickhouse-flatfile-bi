FROM node:20-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS prod

RUN mkdir -p /app
COPY pnpm-lock.yaml /app
WORKDIR /app
RUN pnpm fetch

COPY . /app
RUN pnpm install --frozen-lockfile
RUN pnpm run build

FROM base
RUN mkdir -p /app
WORKDIR /app
COPY --from=prod /app/node_modules /app/node_modules
COPY --from=prod /app/package.json /app/package.json
COPY --from=prod /app/dist /app/dist
EXPOSE 3000
CMD [ "pnpm", "start" ]