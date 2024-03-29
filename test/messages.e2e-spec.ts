import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { faker } from '@faker-js/faker';

import { AppModule } from '../src/app.module';
import { UserRegistrationDto } from '../src/users/dtos/user-registration.dto';
import { User } from '../src/database/schemas/user.model';

describe('MessagesController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let user: User;

  const userDto: UserRegistrationDto = {
    username: faker.internet.userName(),
    emailAddress: faker.internet.email(),
    password: faker.internet.password() + faker.internet.password(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/users/registration (POST)', async () => {
    const userRegistrationDto: UserRegistrationDto = userDto;

    const response = await request(app.getHttpServer())
      .post('/users/registration')
      .send(userRegistrationDto)
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('username', userDto.username);
  });

  it('/users/login (POST)', async () => {
    const userLoginDto = {
      username: userDto.username,
      password: userDto.password,
    };

    const response = await request(app.getHttpServer())
      .post('/users/login')
      .send(userLoginDto)
      .expect(HttpStatus.OK);

    authToken = response.body.access_token;

    expect(response.body).toHaveProperty('access_token');
  });

  it('/users/credentials (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/credentials')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(HttpStatus.OK);

    user = response.body;
  });

  it('POST /messages', async () => {
    const userId = user.id;

    const createMessageDto = {
      content: 'Test message',
      userId,
      expiresIn: 3600,
    };

    return request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createMessageDto)
      .expect(HttpStatus.CREATED)
      .then((response) => {
        expect(response.body).toEqual({
          id: expect.any(String),
          content: createMessageDto.content,
          userId: createMessageDto.userId,
          expiresAt: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });
      });
  });

  it('GET /messages', async () => {
    const response = await request(app.getHttpServer())
      .get('/messages')
      .expect(HttpStatus.OK);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('PUT /messages/:id', async () => {
    const createMessageDto = {
      content: 'Test message',
      userId: user.id,
      expiresIn: 3600,
    };

    const response = await request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createMessageDto)
      .expect(HttpStatus.CREATED);

    const messageId = response.body.id;

    const updateMessageDto = {
      content: 'Updated message',
      expiresIn: 7200,
    };

    return request(app.getHttpServer())
      .put(`/messages/${messageId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send(updateMessageDto)
      .expect(HttpStatus.OK)
      .then((response) => {
        expect(response.body.content).toEqual(updateMessageDto.content);
      });
  });

  it('DELETE /messages/:id', async () => {
    const createMessageDto = {
      content: 'Test message',
      userId: user.id,
      expiresIn: 3600,
    };

    const data = await request(app.getHttpServer())
      .post('/messages')
      .set('Authorization', `Bearer ${authToken}`)
      .send(createMessageDto)
      .expect(HttpStatus.CREATED);

    const messageId = data.body.id;

    const response = await request(app.getHttpServer())
      .delete(`/messages/${messageId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(HttpStatus.OK);

    expect(response.body.deleted).toEqual(true);
  });
});
