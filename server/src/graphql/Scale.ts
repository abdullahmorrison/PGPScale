import { objectType, extendType, nonNull, stringArg, intArg } from "nexus"
import { ScaleModel } from "../models/scale"
import { ScaleOrderModel } from "../models/scaleOrder";
import { UserModel } from "../models/user";
import throwCustomError, { ERROR_LIST } from '../utils/error-handler.helper'

export const Scale = objectType({
    name: "Scale",
    definition(t) {
        t.nonNull.id("id");
        t.nonNull.string("userId");
        t.nonNull.string("goal");
        t.nonNull.int("sliderValue");
        t.nullable.string("chasingSuccessDescription");
        t.nullable.string("avoidingFailureDescription");
    },
})

export const GetScalesOfUser = extendType({
    type: "Query",
    definition(t) {
        t.nonNull.list.nonNull.field("scales", {
            type: "Scale",
            description: "Get scales of a user",
            args: {
              userId: nonNull(stringArg())
            },
            resolve: async (_, args, cxt) => {
                if(!cxt) throwCustomError(ERROR_LIST.FORBIDDEN, "No authenticated user")
                if(cxt.id != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized action: trying to access a user that isn't you")
                  
                await UserModel.findById(args.userId) //check user exists
                  .catch(()=> {throwCustomError(ERROR_LIST.NOT_FOUND, "User with that id does not exist")})

                const scaleOrder = await ScaleOrderModel.find({userId: args.userId})
                  .then((response: any)=>{
                    if(response.length>0) return response[0].scaleOrder
                    else return undefined
                  }).catch((e: Error)=>console.log(`ERROR RETRIEVING SCALE ORDER: ${e}`))
                
                if(scaleOrder){
                  const scales = await ScaleModel.find({userId: args.userId})
                  const scalesMap = new Map(scales.map((scale: any)=> [scale.id, scale]))
                  return scales.map((_: unknown, idx: number)=>scalesMap.get(scaleOrder.at(idx)))
                }

                return await ScaleModel.find({userId: args.userId})
            }
        })
    }
})

export const CreateScaleForUser = extendType({
    type: "Mutation",
    definition(t) {
        t.nonNull.field("createScale", {
            type: "Scale",
            description: "Create a new scale", 
            args: {
                userId: nonNull(stringArg()),
                goal: nonNull(stringArg()),
                sliderValue: intArg(),
                chasingSuccessDescription: stringArg(),
                avoidingFailureDescription: stringArg(),
            },
            resolve: async (_, args, cxt) => {
                if(!cxt) throwCustomError(ERROR_LIST.FORBIDDEN, "No authenticated user")
                if(cxt.id != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized action: trying to access a user that isn't you")

                await UserModel.findById(args.userId) //check user exists
                  .catch(()=> {throwCustomError(ERROR_LIST.NOT_FOUND, "User with that id does not exist")})

                const scale: any = new ScaleModel(args)
                const response = await scale.save()

                //updating the scales order
                const curScaleOrder = await ScaleOrderModel.find({userId: args.userId})
                  .then((response: any)=>{
                    if(response.length>0) return response[0].scaleOrder
                    else return undefined
                  }).catch((e: Error)=>console.log(`ERROR RETRIEVING SCALE ORDER: ${e}`))
                const updatedScaleOrder = curScaleOrder ? [...curScaleOrder, response._id] : [response._id]

                if(curScaleOrder){
                  await ScaleOrderModel.findOneAndUpdate(
                    { userId: args.userId },
                    { $set: { scaleOrder: updatedScaleOrder} },
                    { new: true }
                  ).catch((e: Error)=>console.log(`ERROR ADDING TO SCALE ORDER WHEN CREATING NEW SCALE: ${e}`))
                }else{
                  const u = new ScaleOrderModel({userId: args.userId, scaleOrder: [response._id]})
                  await u.save().catch(()=>console.log("NEW SCALE ORDER FAIL"))
                    .catch((e: Error)=>console.log(`ERROR CREATING NEW SCALE_ORDER WHEN CREATING NEW SCALE: ${e}`))
                }

                return response
            }
        })
    }
})

export const UpdateScale = extendType({
    type: "Mutation",
    definition(t) {
        t.nonNull.field("updateScale", {
            type: "Scale",
            description: "Update a scale",
            args: {
                id: nonNull(stringArg()),
                userId: nonNull(stringArg()),
                goal: stringArg(),
                sliderValue: intArg(),
                chasingSuccessDescription: stringArg(),
                avoidingFailureDescription: stringArg(),
            },
            resolve: async (_, args, cxt) => {
                if(!cxt) throwCustomError(ERROR_LIST.FORBIDDEN, "No authenticated user")
                if(cxt.id != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized action: trying to access a user that isn't you")

                await UserModel.findById(args.userId) //check user exists
                  .catch(()=> throwCustomError(ERROR_LIST.NOT_FOUND, "User with that id does not exist"))
                const scale = await ScaleModel.findById(args.id) //check scale exists
                  .catch(()=> throwCustomError(ERROR_LIST.NOT_FOUND, "Scale with that id does not exist"))
                if(scale.userId != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized scale update")

                const { id, ...updatedScale } = args

                const response = await ScaleModel.findByIdAndUpdate(id, updatedScale, {new: true})
                return response
            }
        })
    }
})

export const DeleteScaleById = extendType({
    type: "Mutation",
    definition(t) {
        t.nonNull.field("deleteScale", {
            type: "Scale",
            description: "Delete a scale",
            args: {
                id: nonNull(stringArg()),
                userId: nonNull(stringArg())
            },
            resolve: async (_, args, cxt) => {
                if(!cxt) throwCustomError(ERROR_LIST.FORBIDDEN, "No authenticated user")
                if(cxt.id != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized action: trying to access a user that isn't you")

                await UserModel.findById(args.userId) //check user exists
                  .catch(()=> throwCustomError(ERROR_LIST.NOT_FOUND, "User with that id does not exist"))
                const scale = await ScaleModel.findById(args.id) //check scale exists
                  .catch(()=> throwCustomError(ERROR_LIST.NOT_FOUND, "Scale with that id does not exist"))
                if(scale.userId != args.userId)
                  throwCustomError(ERROR_LIST.FORBIDDEN, "Unauthorized scale delete")

                //updating the scales order
                const curScaleOrder = await ScaleOrderModel.find({userId: args.userId})
                  .then((response: any)=> response[0].scaleOrder)
                  .catch((e: Error)=>console.log(`DELETE: ERROR RETRIEVING SCALE ORDER: ${e}`))

                const updatedScaleOrder = curScaleOrder.filter((s: any)=>s!=scale._id) 

                await ScaleOrderModel.findOneAndUpdate(
                  { userId: args.userId },
                  { $set: { scaleOrder: updatedScaleOrder} },
                  { new: true }
                ).catch((e: Error)=>console.log(`ERROR UPDATING SCALE ORDER WHEN DELETING SCALE: ${e}`))

                const response = await ScaleModel.findByIdAndDelete(args.id)
                return response
            }
        })
    }
})

