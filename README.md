# 我和秀琴的旅行日记

一个温馨的情侣旅行相册手账网站。两个人用共同密码进入，可以上传照片、填写日期、地点和文字记录。

## 本地预览

直接用浏览器打开 `index.html` 即可预览。没有配置 Supabase 时，照片只会保存到当前浏览器的本机演示数据里，换手机或清缓存后不会保留。

默认共同密码在 `config.example.js` 里：

```js
sitePassword: "1314"
```

## 免费上线方案

推荐组合：

- 网站托管：Vercel 免费版、Netlify 免费版或 GitHub Pages
- 照片和文字存储：Supabase 免费版

Supabase 免费版适合个人小相册，能提供数据库和照片存储。真正长期使用前，建议定期导出备份。

## Supabase 配置

1. 注册 Supabase，创建一个新项目。
2. 新建 Storage bucket，名字用 `love-photos`，设为 public。
3. 在 SQL Editor 执行：

```sql
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  memory_date date not null,
  title text not null,
  location text,
  note text not null,
  photo_path text not null,
  photo_url text not null
);

alter table public.memories enable row level security;

create policy "Anyone can read memories"
on public.memories for select
to anon
using (true);

create policy "Anyone can add memories"
on public.memories for insert
to anon
with check (true);
```

4. 在 SQL Editor 继续执行 Storage 权限：

```sql
create policy "Anyone can read love photos"
on storage.objects for select
to anon
using (bucket_id = 'love-photos');

create policy "Anyone can upload love photos"
on storage.objects for insert
to anon
with check (bucket_id = 'love-photos');
```

5. 打开 `config.example.js`，填入：

```js
supabaseUrl: "你的 Supabase Project URL",
supabaseAnonKey: "你的 Supabase anon public key"
```

## 部署到网上

最简单可以用 Vercel 或 Netlify：

1. 把这个文件夹上传到 GitHub 仓库。
2. 在 Vercel 或 Netlify 选择这个仓库部署。
3. 部署完成后，把网址发给秀琴，两个人用共同密码进入。

手机访问这个网址后，就可以直接选择手机相册里的照片上传。

## 隐私提醒

当前版本是“共同密码保护页面”。它适合个人小范围使用，但不是银行级隐私：如果懂技术的人拿到网页代码，仍可能看到 Supabase 的公开 anon key。

如果以后你想让隐私更强，可以升级为：

- 你和秀琴各自登录账号；
- Supabase Auth 控制读取和上传权限；
- 照片 bucket 改为 private。

这个版本已经把页面和上传流程先做好，后续升级登录方式不用重做整个网站。
