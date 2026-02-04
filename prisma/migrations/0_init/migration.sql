-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "aliasstatus" AS ENUM ('SCORING', 'TIMEOUT', 'PASSED', 'ADMIN_PASSED', 'ADMIN_REJECTED');

-- CreateEnum
CREATE TYPE "bindtype" AS ENUM ('REQUEST', 'CONFIRM');

-- CreateTable
CREATE TABLE "abstracts" (
    "id" SERIAL NOT NULL,
    "music_id" INTEGER NOT NULL,
    "user_id" VARCHAR NOT NULL,
    "nickname" VARCHAR NOT NULL,
    "file_key" VARCHAR NOT NULL,
    "create_time" TIMESTAMP(6) NOT NULL,
    "update_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_abstracts" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alembic_version" (
    "version_num" VARCHAR(32) NOT NULL,

    CONSTRAINT "alembic_version_pkc" PRIMARY KEY ("version_num")
);

-- CreateTable
CREATE TABLE "alias_applies" (
    "id" SERIAL NOT NULL,
    "music_id" INTEGER NOT NULL,
    "alias" VARCHAR NOT NULL,
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "status" "aliasstatus" NOT NULL,
    "create_time" TIMESTAMP(6) NOT NULL,
    "update_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_alias_applies" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alias_votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "create_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_alias_votes" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aliases" (
    "id" SERIAL NOT NULL,
    "music_id" INTEGER NOT NULL,
    "alias" VARCHAR NOT NULL,
    "title" VARCHAR NOT NULL,
    "status" INTEGER NOT NULL,
    "create_time" TIMESTAMP(6) NOT NULL,
    "update_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_aliases" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bind_tokens" (
    "id" UUID NOT NULL,
    "token" VARCHAR NOT NULL,
    "main_user_id" UUID NOT NULL,
    "type" "bindtype" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "sub_user_id" UUID,

    CONSTRAINT "pk_bind_tokens" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_auths" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "external_id" VARCHAR,
    "type" VARCHAR NOT NULL,
    "ext" JSONB,

    CONSTRAINT "pk_user_auths" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_configs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "is_abstract" BOOLEAN NOT NULL,
    "maimai_best_50_style" VARCHAR NOT NULL,
    "maimai_icon" VARCHAR,
    "maimai_plate" VARCHAR,
    "maimai_frame" VARCHAR,
    "chu_prober_mode" VARCHAR NOT NULL,
    "create_group" INTEGER,
    "create_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_user_configs" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_test_configs" (
    "reply_uuid" BOOLEAN NOT NULL,
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,

    CONSTRAINT "pk_user_test_configs" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "create_time" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "pk_users" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bind_tokens_token_key" ON "bind_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "user_auths_external_id_key" ON "user_auths"("external_id");

-- AddForeignKey
ALTER TABLE "bind_tokens" ADD CONSTRAINT "fk_bind_tokens_main_user_id_users" FOREIGN KEY ("main_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bind_tokens" ADD CONSTRAINT "fk_bind_tokens_sub_user_id_users" FOREIGN KEY ("sub_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_auths" ADD CONSTRAINT "fk_user_auths_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_test_configs" ADD CONSTRAINT "fk_user_test_configs_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

