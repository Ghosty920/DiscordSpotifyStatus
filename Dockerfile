# syntax=docker/dockerfile:1

FROM node:24-alpine

ENV NODE_ENV=production

RUN --mount=type=cache,target=/root/.npm \
    npm install -g pnpm

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.local/share/pnpm/store to speed up subsequent builds.
# Leverage a bind mounts to package.json and pnpm-lock.yaml to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
	--mount=type=bind,source=pnpm-lock.yaml,target=pnpm-lock.yaml \
	--mount=type=cache,target=/root/.local/share/pnpm/store \
	pnpm install -P --frozen-lockfile

# Copy the rest of the source files into the image.
COPY . .

# Run the application as a non-root user.
USER node

# Run the application.
CMD pnpm run start