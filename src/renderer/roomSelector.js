import React, { Suspense, useCallback } from 'react';
import { useDatabase, useDatabaseObjectData } from 'reactfire';
import { AddIcon, Button, EnterIcon, ExitIcon } from './ui';
import { RoomState } from './roomAudio';
import usePromise from 'react-promise-suspense';
import birds from './birds';

/**
 * @param {firebase.database.Reference} ref
 * @param childKeys
 */
function useDatabaseObjectDataPartial(ref, childKeys) {
  async function getPartial(ref, keys) {
    /** @type firebase.database.DataSnapshot[] */
    const docSnapshots = await Promise.all(
      keys.map((key) => ref.child(key).once('value'))
    );
    const partial = {};
    for (const snapshot of docSnapshots) {
      partial[snapshot.key] = snapshot.val();
    }
    return partial;
  }

  return usePromise(getPartial, [ref, childKeys]);
}

function RoomUsers({ currentRoomId, roomId, connectionStateByUid }) {
  const database = useDatabase();
  const roomUsers = useDatabaseObjectData(
    database.ref(`rooms/${roomId}/users`)
  );
  const userIds = Object.keys(roomUsers);
  const userDocs = useDatabaseObjectDataPartial(database.ref('users'), userIds);

  return (
    <>
      {Object.entries(userDocs).map(([uid, userDoc]) => (
        <div key={uid} className="flex">
          <div className="px-1">{userDoc.displayName}</div>
          {currentRoomId ? <div>{connectionStateByUid[uid]}</div> : null}
        </div>
      ))}
    </>
  );
}

function Room({
  id,
  currentRoomId,
  connectionStateByUid,
  currentRoomState,
  leaveRoom: leave,
  joinRoom,
}) {
  const transitioning =
    currentRoomState === RoomState.JOINING ||
    currentRoomState === RoomState.LEAVING;

  const join = useCallback(() => {
    if (currentRoomState === RoomState.NONE && id !== currentRoomId) {
      joinRoom(id);
    }
  }, [currentRoomId, currentRoomState, id, joinRoom]);

  let roomName = useDatabaseObjectData(useDatabase().ref(`rooms/${id}/name`));
  if (typeof roomName !== 'string') {
    roomName = '';
  }

  return (
    <div
      key={id}
      className={
        'p-2 pl-3 mb-2 flex shadow-inner rounded bg-gray-100' +
        (id !== currentRoomId
          ? ' hover:bg-gray-200 cursor-pointer border'
          : ' border-solid border border-teal-700')
      }
      onClick={join}
    >
      <div className="flex-1 self-center">
        <span className="font-medium">{roomName}</span>
        <Suspense fallback={<span>Loading...</span>}>
          <RoomUsers
            currentRoomId={currentRoomId}
            roomId={id}
            connectionStateByUid={connectionStateByUid}
          />
        </Suspense>
      </div>
      {currentRoomState === RoomState.JOINED && currentRoomId === id ? (
        <Button className="self-start" onClick={leave} disabled={transitioning}>
          <ExitIcon width={16} height={16} />
        </Button>
      ) : null}
    </div>
  );
}

export function RoomSelector({
  currentRoomId,
  currentRoomState,
  joinRoom,
  leaveRoom,
  connectionStateByUid,
}) {
  const database = useDatabase();

  const allRooms = useDatabaseObjectData(database.ref('rooms'));
  const roomData = Object.entries(allRooms);
  let permanentIds = [];
  let tempIds = [];
  for (const [id, data] of roomData) {
    if (data.permanent) {
      permanentIds.push(id);
    } else {
      tempIds.push(id);
    }
  }

  const createAndJoinRoom = () => {
    const roomRef = database
      .ref(`rooms`)
      .push({ name: birds[Math.floor(Math.random() * birds.length)] });
    joinRoom(roomRef.key);
  };

  const transitioning =
    currentRoomState === RoomState.JOINING ||
    currentRoomState === RoomState.LEAVING;
  return (
    <div className="mt-2">
      <div className="mb-2 small-caps">Lounges</div>
      {permanentIds.map((id) => (
        <Room
          key={id}
          id={id}
          currentRoomId={currentRoomId}
          connectionStateByUid={connectionStateByUid}
          currentRoomState={currentRoomState}
          leaveRoom={leaveRoom}
          joinRoom={joinRoom}
        />
      ))}
      <div className="mt-4 mb-2 flex">
        <div className="flex-1 small-caps">Rooms</div>
        <Button onClick={createAndJoinRoom} disabled={transitioning}>
          <AddIcon width={16} height={16} />
        </Button>
      </div>
      {tempIds.length === 0 ? (
        <div className="text-gray-600 ml-2">No rooms</div>
      ) : (
        tempIds.map((id) => (
          <Room
            key={id}
            id={id}
            currentRoomId={currentRoomId}
            connectionStateByUid={connectionStateByUid}
            currentRoomState={currentRoomState}
            leaveRoom={leaveRoom}
            joinRoom={joinRoom}
          />
        ))
      )}
    </div>
  );
}
