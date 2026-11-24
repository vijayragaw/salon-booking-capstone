# Juniper Studio

A salon booking capstone built with Node.js, HTML, CSS, and browser JavaScript. Customers pick a service and a 30-minute appointment with start times every 15 minutes. The form collects a name, gender, and mobile number, with optional email and notes for the stylist. Staff can view appointments and cancel them to reopen overlapping start times. The demo uses one fictional Bengaluru salon, one stylist, and India Standard Time.

The app uses in-memory storage. Bookings reset when the process or Docker container restarts, including after deployment. Run one app instance so every request sees the same appointment state.

The booking form has three steps. Choose the service, date, and start time, enter customer details, then review the preview and confirm.

## Run locally

Use Node.js 22 or newer. The app has zero npm dependencies.

```sh
npm ci
npm run check
npm test
npm start
```

Open http://localhost:3000. The [staff schedule](http://localhost:3000/?view=staff) accepts `local-demo-key` locally. For the customer demo, select tomorrow's date to ensure the studio has available times.

## Run with Docker

```sh
docker build -t salon-booking .
docker run --rm -p 127.0.0.1:3000:3000 salon-booking
```

## GitHub Actions

The CI workflow checks syntax, runs the booking tests, builds the Docker image, and checks the container's API. It runs on pull requests and pushes to `main`.

The manual **Deploy demo to AWS** workflow builds and starts the container on one EC2 instance using Systems Manager. It requires an AWS environment in GitHub and only runs from `main`.

## Deploy privately to EC2

1. Create a private S3 artifact bucket and launch one Amazon Linux 2023 EC2 instance with outbound internet access. Keep inbound ports closed. Configure the instance to be managed by [Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html). Its instance role also needs `s3:GetObject` on the bucket's `salon/*` prefix. Confirm the AWS CLI and SSM Agent are available on the instance.
2. Open a Systems Manager shell and run `sudo dnf install -y docker` and `sudo systemctl enable --now docker`. Use `sudo install -m 600 /dev/null /etc/salon-booking.env` to create the configuration file. Use `sudoedit /etc/salon-booking.env` to add `STAFF_KEY=<a long random secret>`.
3. In GitHub, configure an `aws` environment restricted to `main`. Set `AWS_REGION`, `AWS_DEPLOY_ROLE_ARN`, `ARTIFACT_BUCKET`, and `INSTANCE_ID` as environment variables. Use a [GitHub OIDC deploy role](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws) scoped to this repository's `aws` environment. Grant it permission to upload to the artifact prefix, send `AWS-RunShellScript` commands to the intended instance, and read its command status.
4. Run **Deploy demo to AWS** in GitHub Actions. Use the [Session Manager plugin and port forwarding](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-sessions-start.html#sessions-start-port-forwarding) to open port 3000 over an authenticated session. Leave this command running while you demo the app at http://localhost:3000.

```sh
aws ssm start-session --target i-REPLACE --document-name AWS-StartPortForwardingSession --parameters "portNumber=3000,localPortNumber=3000"
```

Check your AWS plan and credit balance before creating resources. EC2, EBS, and S3 usage can consume credits. When the demo is finished, remove resources you no longer need.

## Capstone demo

1. Show CI detecting a deliberately failing booking test on a pull request.
2. Run the Docker container locally or open the EC2 demo through the port-forwarding session.
3. Select the same slot in two browser tabs. Book it in the first tab and submit the stale selection from the second tab. The second request is rejected.
4. Open the staff schedule at `/?view=staff`, cancel the appointment, and confirm the time is available again.
