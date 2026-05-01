import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is not configured.`)
  }

  return value
}

function getEventPhotoR2Config() {
  const accountId = requireEnv("CLOUDFLARE_R2_ACCOUNT_ID", process.env.CLOUDFLARE_R2_ACCOUNT_ID)
  const bucketName = requireEnv("CLOUDFLARE_R2_BUCKET_NAME", process.env.CLOUDFLARE_R2_BUCKET_NAME)
  const accessKeyId = requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID", process.env.CLOUDFLARE_R2_ACCESS_KEY_ID)
  const secretAccessKey = requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY", process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY)

  return {
    accountId,
    bucketName,
    accessKeyId,
    secretAccessKey,
  }
}

function getEventPhotoR2Client() {
  const config = getEventPhotoR2Config()

  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

function getFileExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase()
  return extension || "jpg"
}

export function createEventPhotoObjectKey(eventId: string, fileName: string) {
  const extension = getFileExtension(fileName)
  const objectId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return `events/${eventId}/${objectId}.${extension}`
}

export function getEventPhotoPublicUrl(objectKey: string) {
  const publicBaseUrl = requireEnv("CLOUDFLARE_R2_PUBLIC_URL", process.env.CLOUDFLARE_R2_PUBLIC_URL)
  return `${publicBaseUrl.replace(/\/$/, "")}/${objectKey}`
}

export async function createEventPhotoUploadUrl({
  objectKey,
  contentType,
}: {
  objectKey: string
  contentType: string
}) {
  const client = getEventPhotoR2Client()
  const { bucketName } = getEventPhotoR2Config()

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    ContentType: contentType,
  })

  return getSignedUrl(client, command, {
    expiresIn: 900,
  })
}

export async function deleteEventPhotoObject(objectKey: string) {
  const client = getEventPhotoR2Client()
  const { bucketName } = getEventPhotoR2Config()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  )
}

export async function getEventPhotoObjectBytes(objectKey: string) {
  const client = getEventPhotoR2Client()
  const { bucketName } = getEventPhotoR2Config()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  )

  if (!response.Body) {
    throw new Error("Unable to read the source photo from R2.")
  }

  return response.Body.transformToByteArray()
}
