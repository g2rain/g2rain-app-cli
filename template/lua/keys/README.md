# 密钥文件说明

## 文件位置
密钥文件放在 `lua/keys/`：
- `public-key.der` / `private-key.der`（必需，DER 格式）
- 可选：`iam-key-id.txt`、`iam-public-key.pem`

## 生成 DER 密钥
```bash
# 生成私钥（PEM）
openssl ecparam -genkey -name prime256v1 -noout -out private-key.pem
# 提取公钥（PEM）
openssl ec -in private-key.pem -pubout -out public-key.pem
# 转 DER
openssl ec -in private-key.pem -outform DER -out private-key.der
openssl ec -in public-key.pem -pubin -outform DER -out public-key.der
```

## 安全
- 不要提交私钥到版本库；生产建议挂卷或使用 Secrets。
- 权限建议 `chmod 600 lua/keys/private-key.der`.

