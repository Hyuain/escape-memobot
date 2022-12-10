docker run --name memobot --network="host" -d --rm --volume="$(pwd)":/bot wechaty/wechaty bot.ts
